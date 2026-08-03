export const PAYMENT_REVERSAL_REFRESH_FAILURE_MESSAGE =
  "입금 배정 취소는 저장됐지만 최신 입금·사건·미수금 상태를 모두 불러오지 못했습니다.";

export function fetchPaymentReversalSurfaces({
  matterId,
  ctx,
  fetchPayments,
  fetchDetail,
  fetchCloseout,
  fetchTimeBilling
} = {}) {
  const collaborators = { fetchPayments, fetchDetail, fetchCloseout, fetchTimeBilling };
  for (const [name, collaborator] of Object.entries(collaborators)) {
    if (typeof collaborator !== "function") {
      throw new TypeError(`Payment reversal refresh requires ${name}.`);
    }
  }
  return Promise.all([
    fetchPayments({ matterId, ctx }),
    fetchDetail({ matterId, ctx }),
    fetchCloseout({ matterId, ctx }),
    fetchTimeBilling({ matterId, ctx })
  ]);
}

/**
 * Coordinates the production payment-allocation reversal and its canonical
 * Matter billing refresh. State application stays with the surface so this
 * boundary remains usable by focused tests and the rendered UI.
 */
export function createPaymentReversalController({
  reversePayment,
  refreshPaymentSurfaces,
  onPending,
  onResult,
  onPaymentMatchCleared
} = {}) {
  for (const [name, collaborator] of Object.entries({
    reversePayment,
    refreshPaymentSurfaces,
    onPending,
    onResult,
    onPaymentMatchCleared
  })) {
    if (typeof collaborator !== "function") {
      throw new TypeError(`Payment reversal controller requires ${name}.`);
    }
  }

  return {
    async execute({ matterId, allocation, reason, ctx } = {}) {
      const paymentId = allocation?.payment_id;
      const paymentAllocationId = allocation?.payment_allocation_id;
      const normalizedReason = String(reason ?? "").trim();
      if (!matterId || !paymentId || !paymentAllocationId || !normalizedReason) return undefined;

      onPending(true);
      onResult(null);

      const next = await reversePayment({
        matterId,
        paymentId,
        paymentAllocationId,
        reason: normalizedReason,
        ctx
      });
      if (next.kind !== "data") {
        onResult(next);
        onPending(false);
        return next;
      }

      const refreshed = await refreshPaymentSurfaces(matterId, paymentId);
      if (refreshed.kind !== "data") {
        const persistedFailure = {
          ...refreshed,
          kind: "error",
          persisted: true,
          message: PAYMENT_REVERSAL_REFRESH_FAILURE_MESSAGE
        };
        onResult(persistedFailure);
        onPending(false);
        return persistedFailure;
      }

      onPaymentMatchCleared();
      onResult(next);
      onPending(false);
      return next;
    }
  };
}
