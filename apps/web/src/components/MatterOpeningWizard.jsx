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
      ? result.productionReadyClaim ? "승인 검토 필요" : "Matter가 개시되었습니다"
      : result?.kind === "error"
        ? "입력값과 연결 상태를 확인하세요"
        : "필수 정보를 입력하세요";

  return (
    <Panel id="matter-opening" className="matter-runtime-panel" title="Matter 개시" meta="승인 필요">
      <form className="matter-opening-form" data-cmp-g4-opening-wizard="true" onSubmit={submit}>
        <label>
          <span>Matter 등록번호</span>
          <input value={form.matterId} onChange={update("matterId")} />
        </label>
        <label>
          <span>제목</span>
          <input value={form.title} onChange={update("title")} />
        </label>
        <label>
          <span>Matter 번호</span>
          <input value={form.matterNumberSeed} onChange={update("matterNumberSeed")} />
        </label>
        <label>
          <span>법률 Client</span>
          <input value={form.legalClientPartyId} onChange={update("legalClientPartyId")} />
        </label>
        <label>
          <span>청구 Client</span>
          <input value={form.billingClientPartyId} onChange={update("billingClientPartyId")} />
        </label>
        <label>
          <span>이해상충 확인 번호</span>
          <input value={form.clearanceTokenId} onChange={update("clearanceTokenId")} />
        </label>
        <label>
          <span>접수 번호</span>
          <input value={form.intakeRequestId} onChange={update("intakeRequestId")} />
        </label>
        <label>
          <span>검토 번호</span>
          <input value={form.conflictCheckId} onChange={update("conflictCheckId")} />
        </label>
        <label>
          <span>위임 계약 번호</span>
          <input value={form.engagementId} onChange={update("engagementId")} />
        </label>
        <label>
          <span>확인 번호</span>
          <input value={form.snapshotHash} onChange={update("snapshotHash")} />
        </label>
        <div className="matter-form-footer">
          <div>
            <ShieldCheck size={15} />
            <span>{statusText}</span>
          </div>
          <button className="primary-button" disabled={!canSubmit || submitting}>
            <Send size={15} />
            {submitting ? "개시 중" : "개시"}
          </button>
        </div>
      </form>
    </Panel>
  );
}
