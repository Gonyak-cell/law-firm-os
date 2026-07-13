function scopesFrom(record) {
  if (!record || typeof record !== "object") return [];
  return [
    ...(Array.isArray(record.hrx_scopes) ? record.hrx_scopes : []),
    ...(Array.isArray(record.scopes) ? record.scopes : []),
    ...(Array.isArray(record.session?.hrx_scopes) ? record.session.hrx_scopes : []),
    ...(Array.isArray(record.session?.scopes) ? record.session.scopes : []),
    ...(Array.isArray(record.tenant_membership?.scopes) ? record.tenant_membership.scopes : [])
  ];
}

export function listCurrentHrxScopes(records = []) {
  return [...new Set(records.flatMap(scopesFrom).filter((scope) => typeof scope === "string" && scope.startsWith("hrx.")))];
}

export function canManageLeavePolicy(records = []) {
  return listCurrentHrxScopes(records).includes("hrx.leave.policy.read");
}

export function canApproveLeave(records = []) {
  const scopes = listCurrentHrxScopes(records);
  return scopes.includes("hrx.leave.team.read") && scopes.includes("hrx.leave.approve");
}

export function canExecuteLeaveAccrual(records = []) {
  return listCurrentHrxScopes(records).includes("hrx.leave.accrual.execute");
}

export function canAdjustLeaveLedger(records = []) {
  return listCurrentHrxScopes(records).includes("hrx.leave.ledger.adjust");
}

export function canExportLeaveReport(records = []) {
  return listCurrentHrxScopes(records).includes("hrx.leave.report.export");
}

export function canSettleLeaveTermination(records = []) {
  return listCurrentHrxScopes(records).includes("hrx.leave.termination.settle");
}

export function canManageLeavePromotion(records = []) {
  return listCurrentHrxScopes(records).includes("hrx.leave.promotion.manage");
}
