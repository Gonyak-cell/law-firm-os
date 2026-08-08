const INACTIVE_EMPLOYEE_STATUSES = new Set(["inactive", "terminated"]);

function authorityError(code, message, status = 422) {
  return Object.assign(new Error(message), { safe_error_code: code, status });
}

function activeOn(record, date) {
  return record?.status === "active"
    && (!record.effective_from || record.effective_from <= date)
    && (!record.effective_to || record.effective_to >= date);
}

function unique(values, code, message, status) {
  if (values.length !== 1) throw authorityError(code, message, status);
  return values[0];
}

function canonicalEmployee({ employeeRepository, tenantId, actorId, workDate, codes }) {
  if (!["listEmployeeUserLinks", "getEmployee", "listEmploymentProfiles"]
    .every((method) => typeof employeeRepository?.[method] === "function")) {
    throw authorityError(codes.runtime_unavailable, "employee authority is unavailable", 503);
  }
  const link = unique(
    employeeRepository.listEmployeeUserLinks({ tenant_id: tenantId, user_id: actorId }),
    codes.employee_required,
    "signed user must have one active employee link",
    403,
  );
  const employee = employeeRepository.getEmployee({
    tenant_id: tenantId,
    employee_id: link.employee_id,
  });
  if (!employee || INACTIVE_EMPLOYEE_STATUSES.has(employee.status) || employee.status !== "active") {
    throw authorityError(codes.employee_required, "signed user is not an active employee", 403);
  }
  const profile = unique(
    employeeRepository
      .listEmploymentProfiles({ tenant_id: tenantId, employee_id: employee.employee_id })
      .filter((candidate) => activeOn(candidate, workDate)),
    codes.employee_required,
    "signed user must have one active employment profile",
    403,
  );
  return { employee, profile };
}

function applicableRateCard({ repository, tenantId, matterId, workDate, codes }) {
  const arrangements = repository.list({
    tenant_id: tenantId,
    matter_id: matterId,
    model_type: "FeeArrangement",
  }).filter((record) => activeOn(record, workDate));
  let cards;
  if (arrangements.length > 0) {
    const rateCardIds = [...new Set(arrangements.map((record) => record.rate_card_id).filter(Boolean))];
    const rateCardId = unique(
      rateCardIds,
      codes.role_required,
      "Matter must resolve to one active rate card",
      422,
    );
    const card = repository.get({ tenant_id: tenantId, model_type: "RateCard", rate_card_id: rateCardId });
    cards = card ? [card] : [];
  } else {
    cards = repository.list({ tenant_id: tenantId, model_type: "RateCard" })
      .filter((record) => activeOn(record, workDate));
  }
  const card = unique(cards, codes.role_required, "one applicable active rate card is required", 422);
  if (!activeOn(card, workDate) || !Array.isArray(card.role_rates) || card.role_rates.length === 0) {
    throw authorityError(codes.role_required, "applicable rate card has no active roles", 422);
  }
  return card;
}

function assertStaticSnapshotConsistent({ snapshots, tenantId, actorId, employee, roleId, codes }) {
  const candidates = (snapshots ?? []).filter((record) => (
    (record?.tenant_id === undefined || record.tenant_id === tenantId)
    && (record?.user_id === actorId || record?.employee_id === employee.employee_id)
  ));
  if (candidates.length === 0) return;
  const snapshot = unique(
    candidates,
    codes.authority_mismatch,
    "static employee snapshot is ambiguous",
    409,
  );
  if (
    (snapshot.user_id && snapshot.user_id !== actorId)
    || (snapshot.employee_id && snapshot.employee_id !== employee.employee_id)
    || INACTIVE_EMPLOYEE_STATUSES.has(String(snapshot.status ?? snapshot.profile_status ?? "active").toLowerCase())
    || (snapshot.payroll_category && snapshot.payroll_category !== roleId)
  ) {
    throw authorityError(codes.authority_mismatch, "static employee snapshot disagrees with authority", 409);
  }
}

export function resolveOutlookTimeEntryRole({
  financeRuntime,
  tenantId,
  actorId,
  matterId,
  workDate,
  codes,
} = {}) {
  const repository = financeRuntime?.repository;
  if (typeof repository?.list !== "function" || typeof repository?.get !== "function") {
    throw authorityError(codes.runtime_unavailable, "finance role authority is unavailable", 503);
  }
  const { employee, profile } = canonicalEmployee({
    employeeRepository: financeRuntime.employeeRepository,
    tenantId,
    actorId,
    workDate,
    codes,
  });
  const rateCard = applicableRateCard({ repository, tenantId, matterId, workDate, codes });
  const availableRoles = [...new Set(rateCard.role_rates.map(({ role_id }) => role_id).filter(Boolean))];
  const mappedRole = typeof financeRuntime.resolveTimeEntryRole === "function"
    ? financeRuntime.resolveTimeEntryRole({
        tenant_id: tenantId,
        actor_id: actorId,
        employee,
        employment_profile: profile,
        matter_id: matterId,
        work_date: workDate,
        rate_card: rateCard,
      })
    : unique(availableRoles, codes.role_required, "finance role mapping is ambiguous", 422);
  const roleId = String(mappedRole ?? "").trim();
  if (!roleId || !availableRoles.includes(roleId)) {
    throw authorityError(codes.role_mismatch, "finance role is absent from the applicable rate card", 422);
  }
  assertStaticSnapshotConsistent({
    snapshots: financeRuntime.employees,
    tenantId,
    actorId,
    employee,
    roleId,
    codes,
  });
  return Object.freeze({ role_id: roleId, employee_id: employee.employee_id });
}
