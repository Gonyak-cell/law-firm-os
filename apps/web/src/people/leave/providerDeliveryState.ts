export type ProviderDeliveryState = "queued" | "sent" | "delivered" | "read" | "failed" | "unknown";

const RESULT_STATES = new Set<ProviderDeliveryState>([
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
  "unknown",
]);

const LABELS: Record<ProviderDeliveryState, string> = {
  queued: "처리 대기",
  sent: "발송됨",
  delivered: "전달 확인",
  read: "열람 확인",
  failed: "실패",
  unknown: "확인 필요",
};

export function providerDeliveryState({
  resultState,
  state,
  providerKind = "",
  deliveryEvidenceVerified = false,
}: {
  resultState?: unknown;
  state?: unknown;
  providerKind?: string;
  deliveryEvidenceVerified?: boolean;
}): ProviderDeliveryState {
  if (typeof resultState === "string" && RESULT_STATES.has(resultState as ProviderDeliveryState)) {
    return resultState as ProviderDeliveryState;
  }
  if (["pending", "pending_sync", "queued"].includes(String(state))) return "queued";
  if (["failed", "rejected"].includes(String(state))) return "failed";
  if (["not_configured", "disabled", "unknown", "not_created"].includes(String(state))) return "unknown";
  if (["viewed", "read"].includes(String(state))) return "read";
  if (state === "sent") return "sent";
  if (state === "delivered") {
    return providerKind === "notification" && !deliveryEvidenceVerified ? "sent" : "delivered";
  }
  return "unknown";
}

export function providerDeliveryLabel(state: ProviderDeliveryState) {
  return LABELS[state];
}

export function providerDeliveryTone(state: ProviderDeliveryState) {
  if (["delivered", "read"].includes(state)) return "live";
  if (state === "failed") return "error";
  return "review";
}
