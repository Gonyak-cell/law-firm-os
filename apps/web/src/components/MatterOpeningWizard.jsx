import React from "react";
import { useState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { createMatterOpening } from "../data/apiClient.js";
import { Panel } from "./primitives.jsx";

const TENANT_ID = "tenant_rp05_synthetic";
const MATTER_PERMISSION_REF = "ui_cmp_g4_matter_opening";
const MATTER_AUDIT_HINT_REF = "ui_cmp_g4_matter_opening_probe";

function openingPayload({ matterId, title, matterNumberSeed }) {
  return {
    tenant_id: TENANT_ID,
    permission_ref: MATTER_PERMISSION_REF,
    audit_hint_ref: MATTER_AUDIT_HINT_REF,
    actor_id: "user_rp05_owner",
    idempotency_key: `ui:${matterId}:open`,
    matter_number_seed: matterNumberSeed,
    matter: {
      matter_id: matterId,
      tenant_id: TENANT_ID,
      legal_client_party_id: "party_rp04_amic",
      billing_client_party_id: "party_rp04_amic",
      title,
      status: "opening",
      matter_number: `M-UI-${matterNumberSeed}`,
      created_by: "user_rp05_owner",
      created_at: "2026-06-20T00:00:00.000Z",
      permission_envelope_id: "perm_ui_cmp_g4_opening",
      audit_trace_id: "audit_ui_cmp_g4_opening"
    },
    clearance_token: {
      clearance_token_id: "clearance_ui_cmp_g4_opening",
      tenant_id: TENANT_ID,
      intake_request_id: "intake_ui_cmp_g4_opening",
      conflict_check_id: "conflict_ui_cmp_g4_opening",
      engagement_id: "engagement_ui_cmp_g4_opening",
      snapshot_hash: "sha256:ui-cmp-g4-opening",
      token_state: "valid",
      outcome: "passed"
    }
  };
}

export function MatterOpeningWizard({ liveCtx = "allow", onCreated }) {
  const [form, setForm] = useState({
    matterId: "matter_ui_opening_draft_001",
    title: "UI matter opening draft",
    matterNumberSeed: "UI-OPEN-001"
  });
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    const next = await createMatterOpening({
      ctx: liveCtx,
      payload: openingPayload(form)
    });
    setResult(next);
    setSubmitting(false);
    if (next.kind === "data" && next.item) onCreated?.(next.item);
  }

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  const statusText =
    result?.kind === "data"
      ? `${result.statusOutcome}${result.productionReadyClaim ? " / production claim" : " / gated"}`
      : result?.kind === "error"
        ? "error"
        : "ready";

  return (
    <Panel className="matter-runtime-panel" title="Matter Opening" meta={MATTER_AUDIT_HINT_REF}>
      <form className="matter-opening-form" data-cmp-g4-opening-wizard="true" onSubmit={submit}>
        <label>
          <span>Matter ID</span>
          <input value={form.matterId} onChange={update("matterId")} />
        </label>
        <label>
          <span>Title</span>
          <input value={form.title} onChange={update("title")} />
        </label>
        <label>
          <span>Number seed</span>
          <input value={form.matterNumberSeed} onChange={update("matterNumberSeed")} />
        </label>
        <div className="matter-form-footer">
          <div>
            <ShieldCheck size={15} />
            <span>{statusText}</span>
          </div>
          <button className="primary-button" disabled={submitting}>
            <Send size={15} />
            {submitting ? "Opening" : "Open"}
          </button>
        </div>
      </form>
    </Panel>
  );
}
