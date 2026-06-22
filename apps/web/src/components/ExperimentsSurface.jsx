import React from "react";
import { CheckCircle2, CircleHelp, Flag, FlaskConical, PlayCircle, Settings, X } from "lucide-react";
import { MatterLogo } from "./MatterLogo.jsx";
import { CompactTable, DataTable, Field, GaugeChart, PageHeader, Panel, QueryBlock } from "./primitives.jsx";

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
        subtitle="Configure experiments, target cohorts, preview variants, and manage rollout approvals."
        actions={
          <>
            <button className="secondary-button">
              <Flag size={15} />
              New flag
            </button>
            <button className="primary-button" onClick={onConfirm}>
              <FlaskConical size={15} />
              Start rollout
            </button>
          </>
        }
      />
      <div className="experiment-layout">
        <Panel title="Experiment table" meta="Overview state">
          <DataTable
            columns={["Key", "Name", "State", "Traffic", "Owner"]}
            rows={[]}
          />
        </Panel>
        <Panel title="Variant preview" meta="No-code editor">
          <div className="variant-editor">
            <div className="variant-toolbar">
              <button className="secondary-button">A Control</button>
              <button className="secondary-button active">B Treatment</button>
            </div>
            <div className="variant-canvas">
              <div className="mini-product-card">
                <GaugeChart value={41} />
                <strong>Billing guardrail</strong>
                <span>Partner approval required</span>
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
    expSiteSetup: "Site Setup",
    expVariantsDrawer: "Variants",
    expGoalsDraft: "Goals",
    expGoalsConfigured: "Goals",
    expDelivery: "Advanced (Optional)"
  }[mode];

  return (
    <section className="experiment-drawer-state">
      <aside className="experiment-drawer-nav">
        <h1>Experiment Setup</h1>
        <p><FlaskConical size={18} /> A/B Test, Web</p>
        {["Site Setup", "Variants", "Goals", "Pages", "Targeting", "Advanced (Optional)"].map((item) => (
          <button key={item} className={active === item ? "active" : ""}>
            <span>{item}</span>
          </button>
        ))}
        <button className="secondary-button drawer-save">Save All & Close</button>
      </aside>
      <main className="experiment-drawer-panel">
        {mode === "expSiteSetup" && <ExperimentSetupSite />}
        {mode === "expVariantsDrawer" && <ExperimentSetupVariants />}
        {mode === "expGoalsDraft" && <ExperimentSetupGoals configured={false} />}
        {mode === "expGoalsConfigured" && <ExperimentSetupGoals configured />}
        {mode === "expDelivery" && <ExperimentSetupDelivery />}
        <button className="primary-button drawer-next">
          Next: {mode === "expSiteSetup" ? "Variants" : mode === "expVariantsDrawer" ? "Goals" : "Pages"}
        </button>
      </main>
    </section>
  );
}

export function ExperimentSetupSite() {
  return (
    <>
      <h2>Site Setup</h2>
      <div className="notice success"><CheckCircle2 size={18} /> <strong>Script tag detected!</strong> Edit variants and run your test.</div>
      <p>To use the Visual Experiment Editor and to run web experiments:</p>
      <div className="script-card">
        <strong>Recommended</strong>
        <p>Paste this snippet into the head of every page of your website</p>
        <pre>{`<script type="text/javascript"\nsrc="/matter-experiments/runtime.js">\n</script>`}</pre>
      </div>
      <h3>Other ways to connect</h3>
      <div className="connector-grid"><button>WordPress</button><button>Shopify</button><button>Tag Managers*</button></div>
      <a>Additional resources</a>
    </>
  );
}

export function ExperimentSetupVariants() {
  return (
    <>
      <h2>Variants (2)</h2>
      <p>Set up your variants. Each variant can either redirect to a different URL or change elements by adding custom code or using the Visual Experiment Editor.</p>
      <button className="secondary-button wide">Open Visual Editor</button>
      <div className="variant-setup-row"><span className="pill-blue">A</span><strong>control</strong><small>Control</small><Settings size={18} /></div>
      <div className="variant-setup-row"><span className="pill-green">B</span><strong>treatment</strong><a>Setup your variant</a><Settings size={18} /></div>
      <button className="text-button">Add a Variant</button>
    </>
  );
}

export function ExperimentSetupGoals({ configured }) {
  return (
    <>
      <h2>Goals</h2>
      <p>Set clear goals to track your experiment's impact - success goals to improve metrics and guardrails to maintain or prevent drops.</p>
      <div className="toggle-row"><CircleHelp size={15} /> Enable Recommendation <span className="toggle-on" /></div>
      <div className="notice">Remember that all metrics are divided by number of exposures in each variant. You do not need to divide your formula metrics by UNIQUES(A)</div>
      <section className="goal-config-box">
        <header>{configured ? "Sign up interest will increase by >= 2%" : "Define the goal"} <X size={16} /></header>
        <label>Metric<button>{configured ? "Sign up interest" : "Select metric..."}</button></label>
        <a>Create a custom metric</a>
        <label>Type<span><button className={configured ? "active" : ""}>Success</button><button>Guardrail</button></span></label>
        <label>Direction<button>{configured ? "Increase" : "Increase"}</button></label>
        {configured && <label>Minimally acceptable goal <input value="2" readOnly />%</label>}
      </section>
      <button className="text-button">Add a Goal</button>
    </>
  );
}

export function ExperimentSetupDelivery() {
  return (
    <>
      <h2>Delivery Options</h2>
      {["Page load delay", "Sticky Bucketing", "Bucketing Salt"].map((item, index) => (
        <section key={item} className="delivery-option">
          <header><strong>{item}</strong>{index === 0 && <span className="toggle-off" />}</header>
          <p>{index === 0 ? "When on, load all page elements including user targeting and added custom elements at the same time." : index === 1 ? "Serve users the same variant once they have been allocated, even if rollout or targeting criteria is updated." : "For advanced use cases only, change this to link assignments across different flags and experiments."}</p>
          {index === 2 && <button>dBST2auC</button>}
        </section>
      ))}
    </>
  );
}

export function ExperimentVisualEditorSurface({ mode }) {
  return (
    <section className="experiment-visual-state">
      <header>
        <strong><span className="event-source-dot">M</span> Sign Up</strong>
        <nav><span>Variants</span><b>A</b> Original <b className="green">B</b> treatment</nav>
        <button className="primary-button">Continue</button>
      </header>
      <main>
        <button className="secondary-button deploy">Deploy to Vercel</button>
        <button className="secondary-button login-preview">Login</button>
        <h1>The fastest way to build apps with<br />Supabase and Next.js</h1>
        <h2>Next steps</h2>
        <p><input type="checkbox" /> Sign up your first user</p>
        {mode === "expVisualEditor" && (
          <div className="visual-property-panel">
            <h3>Selector</h3>
            <input value={'LABEL.".text-lg"'} readOnly />
            <label>Display <span><button className="active">Block</button><button>None</button></span></label>
            <label>Visibility <span><button className="active">Visible</button><button>Hidden</button></span></label>
            <label>Text <textarea value="Sign up your first user" readOnly /></label>
            <footer><button>Cancel</button><button disabled>Apply</button></footer>
          </div>
        )}
        {mode === "expActionModal" && (
          <div className="visual-action-modal">
            <h2>Apply an action to this variant</h2>
            <p>Variant actions are types of changes you want to implement per variant.</p>
            <div><button>Element changes<br /><small>Text, images, color</small></button><button>URL Redirect<br /><small>Different URL paths</small></button></div>
          </div>
        )}
        {mode === "expAdding" && (
          <div className="visual-loading-modal">
            <span className="event-source-dot">M</span>
            <h2>Adding variants to your experiment...</h2>
            <p>Finish setting up the rest of your experiment: goals, targeting, and your statistical preferences.</p>
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
        <span>Experiments | default</span>
        <h1><FlaskConical size={25} /> Sign Up <small>{mode === "expStartModal" ? "Draft" : "Running"}</small></h1>
        <button className="secondary-button">Stop Experiment</button>
      </header>
      <div className="experiment-detail-grid">
        <aside className="experiment-overview-card">
          <h2>Overview</h2>
          {["Experiment Analysis Range|December 17, 2024 - January 16, 2025", "Feature Flag|sign-up", "Name|Sign Up", "Description|--", "Experiment Type|A/B test", "Category|Web", "Links|--", "Tags|None"].map((item) => {
            const [label, value] = item.split("|");
            return <p key={label}><strong>{label}</strong><span>{value}</span></p>;
          })}
        </aside>
        <main>
          <nav><button className={!isActivity ? "active" : ""}>Settings</button><button className={isActivity ? "active" : ""}>Activity</button></nav>
          {!isActivity ? <ExperimentSettingsPanels /> : <ExperimentActivityPanels />}
        </main>
      </div>
      {mode === "expStartModal" && (
        <div className="modal-layer modal-layer-expStart" role="presentation">
          <section className="modal modal-start-experiment">
            <header className="modal-head"><h2>Start Experiment</h2><X size={16} /></header>
            <div className="modal-body"><p>This activates the experiment and sets the analysis dates using the following settings.</p><div className="notice danger">This experiment is not targeting anybody.</div><strong>Experiment Analysis Range</strong><button className="location-select">Dec 17, 2024 - Jan 16, 2025</button></div>
            <footer className="modal-footer"><button className="secondary-button">Cancel</button><button className="primary-button">Start Experiment</button></footer>
          </section>
        </div>
      )}
    </section>
  );
}

export function ExperimentSettingsPanels() {
  return <><Panel title="Targeting" meta="Assignment"><div className="rollout-line"><span>Audience<br /><b>All users</b></span><span>Rollout<br /><b>0%</b><i /></span></div></Panel><div className="experiment-two-panels"><Panel title="Goals (1)" meta="Success"><p>Sign up interest</p></Panel><Panel title="Variants (2)" meta="Element changes"><p><span className="pill-blue">A</span> control</p><p><span className="pill-green">B</span> treatment</p></Panel></div><Panel title="Analysis Settings" meta="Exposure Event"><p>matter impression</p></Panel></>;
}

export function ExperimentActivityPanels() {
  return <><div className="experiment-two-panels"><Panel title="Data Quality" meta="In Progress"><p>Experiment Setup</p><p>Implementation & Instrumentation</p><p>Statistical Integrity</p></Panel><Panel title="Summary" meta="NOT SIGNIFICANT"><p><strong>HYPOTHESIS</strong></p><p>Comparing variant to control, Sign up interest will increase by &gt;= 2%</p></Panel></div><Panel title="Analysis" meta="Since Nov 17, 2024"><p>No data has been received from exposed users yet.</p></Panel><Panel title="Diagnostics" meta="Dec 17, 2024 - Jan 16, 2025"><p>No data has been received from exposed users yet.</p></Panel></>;
}

export function ExperimentBuilderSurface({ labels, onConfirm }) {
  return (
    <section className="experiment-builder-surface">
      <aside className="experiment-steps">
        {["Info", "Targeting", "Variants", "Delivery", "Review"].map((step, index) => (
          <button key={step} className={index === 1 ? "active" : ""}>
            <span>{index + 1}</span>
            {step}
          </button>
        ))}
      </aside>
      <main className="experiment-builder-main">
        <PageHeader
          title="Matter dashboard onboarding"
          subtitle="Target the audience, edit variants, and preview the workflow before rollout."
          actions={
            <>
              <button className="secondary-button">
                <PlayCircle size={15} />
                Preview
              </button>
              <button className="primary-button" onClick={onConfirm}>
                <FlaskConical size={15} />
                Start rollout
              </button>
            </>
          }
        />
        <div className="experiment-builder-grid">
          <Panel title="Targeting" meta="Audience and URL rules">
            <div className="targeting-stack">
              <QueryBlock title="Page" value="/matters/:matterId/dashboard" meta="server-owned matter workspace" />
              <QueryBlock title="Audience" value="Matter team" meta="server-owned eligible users" />
              <QueryBlock title="Exposure" value="Once per matter" meta="with approval guardrail" />
            </div>
          </Panel>
          <Panel title="Variant Editor" meta="No-code preview">
            <div className="experiment-preview-canvas">
              <div className="preview-toolbar">
                <button className="secondary-button active">Control</button>
                <button className="secondary-button">Treatment</button>
                <button className="secondary-button">CSS</button>
              </div>
              <div className="preview-card">
                <MatterLogo compact />
                <strong>Matter setup checklist</strong>
                <p>Connect DMS, billing, audit, and client portal events.</p>
                <button className="primary-button">Continue</button>
              </div>
            </div>
          </Panel>
          <Panel title="Variant Properties" meta="Styles and controls">
            <div className="control-stack">
              <Field label="Primary color" value="#0B65E5" />
              <Field label="Button text" value="Continue" />
              <Field label="Traffic allocation" value="41%" />
              <label className="toggle-row">
                <span>Require approval</span>
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
        subtitle="Create experiments and feature flags for controlled matter workflow changes."
        actions={
          <>
            <button className="secondary-button">
              <Flag size={15} />
              New Feature Flag
            </button>
            <button className="primary-button" onClick={onNewExperiment}>
              <FlaskConical size={15} />
              New Web Experiment
            </button>
          </>
        }
      />
      <div className="experiment-overview-grid">
        <Panel title="Web experimentation" meta="Personalize matter workspace flows">
          <div className="overview-card-body">
            <FlaskConical size={30} />
            <p>Create page-level tests, target cohorts, and route traffic by matter team.</p>
            <button className="primary-button" onClick={onNewExperiment}>Create Experiment</button>
          </div>
        </Panel>
        <Panel title="Feature Flags" meta="Controlled release management">
          <div className="overview-card-body">
            <Flag size={30} />
            <p>Roll out workflow changes to selected groups while retaining approval control.</p>
            <button className="secondary-button">Create Flag</button>
          </div>
        </Panel>
        <Panel title="Recent activity" meta="Experiment resources">
          <CompactTable
            columns={["Item", "State", "Owner"]}
            rows={[]}
          />
        </Panel>
      </div>
    </section>
  );
}
