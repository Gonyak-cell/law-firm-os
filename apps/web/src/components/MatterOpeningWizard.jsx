import React from "react";
import { useEffect, useState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { createMatterOpening, fetchIntakeClearanceTokens } from "../data/apiClient.js";
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
  matterType,
  litigationAxis,
  clearanceToken
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
      matter_type_english: matterType,
      matter_litigation_axis: matterType === "LIT" ? litigationAxis : null,
      matter_detail_type_korean: title,
      title,
      status: "opening",
      matter_number: matterNumberSeed,
      created_by: ACTOR_ID,
      created_at: new Date().toISOString(),
      permission_envelope_id: "perm_ui_cmp_g4_opening",
      audit_trace_id: "audit_ui_cmp_g4_opening"
    },
    clearance_token: clearanceToken
  };
}

export function MatterOpeningWizard({ liveCtx = "allow", onCreated }) {
  const [form, setForm] = useState({
    matterId: "",
    title: "",
    matterNumberSeed: "",
    legalClientPartyId: "",
    billingClientPartyId: "",
    matterType: "LIT",
    litigationAxis: "CIV"
  });
  const [clearanceTokens, setClearanceTokens] = useState([]);
  const [selectedClearanceTokenId, setSelectedClearanceTokenId] = useState("");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = ["matterId", "title", "matterNumberSeed", "legalClientPartyId", "billingClientPartyId", "matterType"]
    .every((field) => form[field].trim().length > 0)
    && (form.matterType !== "LIT" || form.litigationAxis.trim().length > 0)
    && selectedClearanceTokenId.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    async function loadClearanceTokens() {
      const next = await fetchIntakeClearanceTokens({ ctx: liveCtx });
      if (cancelled || next.kind !== "data") return;
      const issued = next.items.filter((item) => item?.clearance_token_id && item?.token_state !== "expired" && item?.token_state !== "stale");
      setClearanceTokens(issued);
      setSelectedClearanceTokenId((current) => current || issued[0]?.clearance_token_id || "");
    }
    loadClearanceTokens();
    return () => {
      cancelled = true;
    };
  }, [liveCtx]);

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    const clearanceToken = clearanceTokens.find((token) => token.clearance_token_id === selectedClearanceTokenId);
    if (!clearanceToken) return;
    setSubmitting(true);
    const next = await createMatterOpening({
      ctx: liveCtx,
      payload: openingPayload({ ...form, clearanceToken })
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
      : clearanceTokens.length === 0
        ? "발급된 클리어런스가 없습니다"
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
          <span>업무 유형</span>
          <select value={form.matterType} onChange={update("matterType")}>
            <option value="LIT">소송</option>
            <option value="DEAL">Deal</option>
            <option value="Advisory">기업자문</option>
            <option value="Dispute">분쟁</option>
          </select>
        </label>
        {form.matterType === "LIT" && (
          <label>
            <span>소송 구분</span>
            <select value={form.litigationAxis} onChange={update("litigationAxis")}>
              <option value="CIV">민사소송</option>
              <option value="CRM">형사소송</option>
              <option value="ADM">행정소송</option>
            </select>
          </label>
        )}
        <label>
          <span>이해상충 클리어런스</span>
          <select value={selectedClearanceTokenId} onChange={(event) => setSelectedClearanceTokenId(event.target.value)}>
            <option value="">선택</option>
            {clearanceTokens.map((token) => (
              <option key={token.clearance_token_id} value={token.clearance_token_id}>
                {token.clearance_token_id}
              </option>
            ))}
          </select>
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
