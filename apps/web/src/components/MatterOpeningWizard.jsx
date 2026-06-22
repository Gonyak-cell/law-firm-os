import React from "react";
import { useState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { createMatterOpening } from "../data/apiClient.js";
import { Panel } from "./primitives.jsx";

const TENANT_ID = "matter-runtime-tenant";
const ACTOR_ID = "matter-operator";
const MATTER_PERMISSION_REF = "ui_cmp_g4_matter_opening";
const MATTER_AUDIT_HINT_REF = "ui_cmp_g4_matter_opening_probe";

function openingPayload({
  matterId,
  title,
  matterNumberSeed,
  legalClientPartyId,
  billingClientPartyId,
  clearanceTokenId,
  intakeRequestId,
  conflictCheckId,
  engagementId,
  snapshotHash
}) {
  return {
    tenant_id: TENANT_ID,
    permission_ref: MATTER_PERMISSION_REF,
    audit_hint_ref: MATTER_AUDIT_HINT_REF,
    actor_id: ACTOR_ID,
    idempotency_key: `ui:${matterId}:open`,
    matter_number_seed: matterNumberSeed,
    matter: {
      matter_id: matterId,
      tenant_id: TENANT_ID,
      legal_client_party_id: legalClientPartyId,
      billing_client_party_id: billingClientPartyId,
      title,
      status: "opening",
      matter_number: matterNumberSeed,
      created_by: ACTOR_ID,
      created_at: new Date().toISOString(),
      permission_envelope_id: "perm_ui_cmp_g4_opening",
      audit_trace_id: "audit_ui_cmp_g4_opening"
    },
    clearance_token: {
      clearance_token_id: clearanceTokenId,
      tenant_id: TENANT_ID,
      intake_request_id: intakeRequestId,
      conflict_check_id: conflictCheckId,
      engagement_id: engagementId,
      snapshot_hash: snapshotHash,
      token_state: "valid",
      outcome: "passed"
    }
  };
}

export function MatterOpeningWizard({ liveCtx = "allow", onCreated }) {
  const [form, setForm] = useState({
    matterId: "",
    title: "",
    matterNumberSeed: "",
    legalClientPartyId: "",
    billingClientPartyId: "",
    clearanceTokenId: "",
    intakeRequestId: "",
    conflictCheckId: "",
    engagementId: "",
    snapshotHash: ""
  });
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = Object.values(form).every((value) => value.trim().length > 0);

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
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
        : "enter runtime values";

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
        <label>
          <span>Legal client party ID</span>
          <input value={form.legalClientPartyId} onChange={update("legalClientPartyId")} />
        </label>
        <label>
          <span>Billing client party ID</span>
          <input value={form.billingClientPartyId} onChange={update("billingClientPartyId")} />
        </label>
        <label>
          <span>Clearance token ID</span>
          <input value={form.clearanceTokenId} onChange={update("clearanceTokenId")} />
        </label>
        <label>
          <span>Intake request ID</span>
          <input value={form.intakeRequestId} onChange={update("intakeRequestId")} />
        </label>
        <label>
          <span>Conflict check ID</span>
          <input value={form.conflictCheckId} onChange={update("conflictCheckId")} />
        </label>
        <label>
          <span>Engagement ID</span>
          <input value={form.engagementId} onChange={update("engagementId")} />
        </label>
        <label>
          <span>Snapshot hash</span>
          <input value={form.snapshotHash} onChange={update("snapshotHash")} />
        </label>
        <div className="matter-form-footer">
          <div>
            <ShieldCheck size={15} />
            <span>{statusText}</span>
          </div>
          <button className="primary-button" disabled={!canSubmit || submitting}>
            <Send size={15} />
            {submitting ? "Opening" : "Open"}
          </button>
        </div>
      </form>
    </Panel>
  );
}
