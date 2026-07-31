import { startPeopleOverviewHarness } from "./people-overview-test-support.mjs";

const TODAY = "2026-07-30";

function clone(value) {
  return structuredClone(value);
}

function dateBefore(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function currentProfile(profiles, asOf = TODAY) {
  return [...profiles]
    .filter((profile) => profile.effective_from <= asOf)
    .filter((profile) => !profile.effective_to || profile.effective_to >= asOf)
    .sort((left, right) => left.effective_from.localeCompare(right.effective_from))
    .at(-1) ?? null;
}

function seedState() {
  return {
    employees: [
      {
        employee_id: "emp-1",
        display_name: "김아민",
        legal_name: "김아민",
        work_email: "member-1@example.test",
        status: "active",
        department: "송무",
      },
      {
        employee_id: "emp-2",
        display_name: "이서윤",
        legal_name: "이서윤",
        work_email: "member-2@example.test",
        status: "active",
        department: "자문",
      },
    ],
    profiles: new Map([
      ["emp-1", [{
        profile_id: "profile-1",
        employee_id: "emp-1",
        employment_type: "full_time",
        status: "active",
        title: "파트너 변호사",
        org_unit_id: "group_litigation",
        manager_employee_id: null,
        effective_from: "2026-01-01",
        effective_to: null,
      }]],
      ["emp-2", [{
        profile_id: "profile-2",
        employee_id: "emp-2",
        employment_type: "full_time",
        status: "active",
        title: "변호사",
        org_unit_id: "group_litigation",
        manager_employee_id: "emp-1",
        effective_from: "2026-01-01",
        effective_to: null,
      }]],
    ]),
    links: [],
    loginAccounts: [
      {
        user_id: "iam-user-1",
        display_name: "김아민",
        email: "amin@example.test",
        title: "구성원",
        account_label: "김아민 · amin@example.test",
      },
    ],
    attendance: [
      {
        tenant_id: "tenant-a",
        attendance_id: "att-emp-1-2026-07-29",
        employee_id: "emp-1",
        work_date: "2026-07-29",
        status: "present",
        source_ref: "TimeClock:att-emp-1-2026-07-29",
        source_kind: "manual",
        clock_in_at: "2026-07-29T09:05:00+09:00",
        clock_out_at: "2026-07-29T18:10:00+09:00",
        correction_of_attendance_id: null,
        source_version: `sha256:${"a".repeat(64)}`,
      },
    ],
    attendanceCorrectionRequests: [],
    attendanceApprovals: [],
    overtime: [
      {
        tenant_id: "tenant-a",
        overtime_id: "overtime-seed-1",
        employee_id: "emp-1",
        work_date: "2026-07-29",
        hours: 2,
        calculated_minutes: 65,
        requested_minutes: 120,
        approved_minutes: 0,
        reason: "재판 준비",
        state: "submitted",
        payroll_segment_kind: "overtime",
        warning_codes_json: JSON.stringify(["OVERTIME_REQUEST_EXCEEDS_CALCULATED"]),
      },
    ],
    conversionReceipts: new Map(),
    conversionRequests: [],
    recruitingCandidateAdversaries: [],
    recruitingApplicationAdversaries: [],
    recruitingPipelineRequests: [],
    recruitingPipelineFailuresRemaining: 0,
    recruitingSourceReady: false,
    onboarding: [{
      onboarding_id: "onb-template-1",
      employee_id: "emp-2",
      start_date: "2026-08-01",
      template_ref: { template_id: "lawyer-onboarding", version: "1", role_key: "lawyer" },
      document_refs: ["Vault:policy-ack"],
      tasks: [
        {
          task_id: "documents",
          title: "입사 서류 확인",
          owner_role: "people_ops",
          due_on: "2026-07-30",
          required: true,
          depends_on_task_ids: [],
          status: "pending",
          attempt_count: 0,
        },
        {
          task_id: "account",
          title: "업무 계정 설정",
          owner_role: "it_ops",
          due_on: "2026-08-01",
          required: true,
          depends_on_task_ids: ["documents"],
          status: "pending",
          attempt_count: 0,
        },
      ],
    }],
    offboarding: [{
      offboarding_id: "off-template-1",
      employee_id: "emp-1",
      separation_date: "2026-08-31",
      state: "open",
      template_ref: { template_id: "lawyer-offboarding", version: "1", role_key: "lawyer" },
      tasks: [
        {
          task_id: "handover",
          title: "담당 사건 인수인계",
          owner_role: "matter_owner",
          due_on: "2026-08-26",
          required: true,
          depends_on_task_ids: [],
          status: "failed",
          attempt_count: 1,
          last_failure_reason: "담당자 확인이 필요합니다",
        },
      ],
      access_revocations: [{ revoked: false, confirmation_ref: null }],
      document_returns: [{ returned: true }],
      legal_hold_checks: [{ clear: true }],
      matter_reassignments: [{ reassigned: false, reassigned_to_employee_id: null }],
      handover_items: [{ completed: false }],
      operational_close: {
        source_state: "ok",
        ready: false,
        blockers: [
          {
            code: "active_matter_assignment",
            category: "matter_reassignment",
            subject_ref: "matter-open-001",
          },
          {
            code: "evidence_source_stale",
            category: "handover",
            subject_ref: "handover",
          },
        ],
        evidence_count: 4,
      },
    }],
    requestLog: [],
    profileSequence: 10,
  };
}

function employeeResponse(state, employeeId, asOf = TODAY) {
  const employee = state.employees.find((candidate) => candidate.employee_id === employeeId);
  if (!employee) return null;
  const profile = currentProfile(state.profiles.get(employeeId) ?? [], asOf);
  const manager = profile?.manager_employee_id
    ? state.employees.find((candidate) => candidate.employee_id === profile.manager_employee_id)
    : null;
  return {
    outcome: "ok",
    employee: {
      ...employee,
      title: profile?.title ?? null,
      employment_type: profile?.employment_type ?? null,
      org_unit_id: profile?.org_unit_id ?? null,
      manager_employee_id: profile?.manager_employee_id ?? null,
      manager_display_name: manager?.display_name ?? null,
      affiliation: "AMIC Law",
      organization_group: profile?.org_unit_id === "group_firm_leadership" ? "Firm Leadership" : "Litigation",
    },
    employment_profile: profile,
    professional_profile: null,
    masked_compensation_ref: null,
  };
}

function orgChartResponse(state, asOf = TODAY) {
  const orgUnits = [
    {
      org_unit_id: "group_litigation",
      label: "Litigation",
      department: "Legal",
      parent_org_unit_id: "org_legal",
      member_count: 0,
    },
    {
      org_unit_id: "group_firm_leadership",
      label: "Firm Leadership",
      department: "Management",
      parent_org_unit_id: "org_legal",
      member_count: 0,
    },
  ];
  const employees = state.employees.map((employee) => {
    const profile = currentProfile(state.profiles.get(employee.employee_id) ?? [], asOf);
    const manager = profile?.manager_employee_id
      ? state.employees.find((candidate) => candidate.employee_id === profile.manager_employee_id)
      : null;
    return {
      employee_id: employee.employee_id,
      display_name: employee.display_name,
      status: employee.status,
      title: profile?.title ?? "구성원",
      org_unit_id: profile?.org_unit_id ?? null,
      org_unit_label: orgUnits.find((unit) => unit.org_unit_id === profile?.org_unit_id)?.label ?? "미등록",
      department: employee.department,
      manager_employee_id: profile?.manager_employee_id ?? null,
      manager_display_name: manager?.display_name ?? null,
      direct_report_count: 0,
    };
  });
  for (const unit of orgUnits) {
    unit.member_count = employees.filter((employee) => employee.org_unit_id === unit.org_unit_id).length;
  }
  const scheduledChanges = [];
  for (const [employeeId, profiles] of state.profiles) {
    const employee = state.employees.find((candidate) => candidate.employee_id === employeeId);
    for (const profile of profiles.filter((candidate) => candidate.effective_from > asOf)) {
      const manager = profile.manager_employee_id
        ? state.employees.find((candidate) => candidate.employee_id === profile.manager_employee_id)
        : null;
      scheduledChanges.push({
        ...profile,
        employee_display_name: employee?.display_name ?? employeeId,
        org_unit_label: orgUnits.find((unit) => unit.org_unit_id === profile.org_unit_id)?.label ?? "미등록",
        manager_display_name: manager?.display_name ?? null,
      });
    }
  }
  return {
    outcome: "ok",
    as_of: asOf,
    org_units: orgUnits,
    employees,
    reporting_lines: employees.map((employee) => ({
      employee_id: employee.employee_id,
      manager_employee_id: employee.manager_employee_id,
    })),
    change_events: [],
    scheduled_changes: scheduledChanges,
    claim_boundary: { source_of_truth: "EmploymentProfile" },
  };
}

async function json(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function startPeopleManagementHarness() {
  return startPeopleOverviewHarness();
}

export async function openPeopleManagementPage({
  browser,
  baseUrl,
  section = "people-members",
  viewport = { width: 1440, height: 1000 },
  denyWrites = false,
  featureFlags = {},
  hrxScopes = [],
  attendanceReadState = "data",
  overtimeReadState = "data",
  lifecycleRosterVisible = true,
  prepareState = null,
}) {
  const state = seedState();
  if (typeof prepareState === "function") prepareState(state);
  const page = await browser.newPage({ viewport });
  await page.addInitScript(({ runtimeFlags, scopes }) => {
    window.__LAWOS_PEOPLE_FEATURE_FLAGS__ = {
      people_overview: true,
      people_member_brief: true,
      outlook_calendar: false,
      people_capacity: false,
      attendance_correction_workflow: false,
      payroll_handoff: false,
      ...runtimeFlags,
    };
    if (scopes.length > 0) {
      window.__LAWOS_SESSION_CONTEXT__ = {
        schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
        state: "signed_in",
        session_ref: "session-people-management-test",
        source: "desktop_offline_login",
        actor_ref: "user-manager-test",
        tenant_refs: { default: "tenant-a", hrx: "tenant-a" },
        role_ids: ["lawos_partner"],
        scopes,
        review_state: "allow",
      };
    }
  }, { runtimeFlags: featureFlags, scopes: hrxScopes });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();
    state.requestLog.push({ pathname, method });

    if (pathname === "/api/hrx/employees") {
      if (method === "POST") {
        if (denyWrites) return json(route, 403, { safe_error_code: "HRX_PERMISSION_DENIED" });
        const body = request.postDataJSON();
        if (state.employees.some((employee) => employee.employee_id === body.employee_id)) {
          return json(route, 409, { safe_error_code: "HRX_EMPLOYEE_ID_ALREADY_EXISTS" });
        }
        const employee = { ...body };
        state.employees.push(employee);
        state.profiles.set(employee.employee_id, []);
        return json(route, 201, { outcome: "created", employee });
      }
      return json(route, 200, {
        outcome: "ok",
        employees: state.employees.map((employee) => ({
          ...employee,
          ...(currentProfile(state.profiles.get(employee.employee_id) ?? [], TODAY) ?? {}),
        })),
      });
    }

    if (pathname === "/api/hrx/attendance/correction-requests" && method === "GET") {
      const employeeId = url.searchParams.get("employee_id");
      return json(route, 200, {
        outcome: "ok",
        correction_requests: clone(
          state.attendanceCorrectionRequests.filter(
            (item) => !employeeId || item.employee_id === employeeId,
          ),
        ),
      });
    }
    if (pathname === "/api/hrx/payroll/attendance-approvals" && method === "POST") {
      if (denyWrites) return json(route, 403, { safe_error_code: "HRX_PERMISSION_DENIED" });
      const body = request.postDataJSON();
      const existing = state.attendanceApprovals.find(
        (item) => item.idempotency_key === body.idempotency_key,
      );
      const receipt = existing ?? {
        approval_receipt_id: `attendance-approval-${state.attendanceApprovals.length + 1}`,
        attendance_id: body.attendance_id,
        approved_by_actor_id: "manager-test",
        approved_at: "2026-07-30T10:00:00.000Z",
        idempotency_key: body.idempotency_key,
      };
      if (!existing) state.attendanceApprovals.push(receipt);
      return json(route, existing ? 200 : 201, {
        outcome: "approved",
        approval_receipt: clone(receipt),
      });
    }
    if (pathname === "/api/hrx/overtime/risks" && method === "GET") {
      if (overtimeReadState === "error") return json(route, 500, { safe_error_code: "HRX_OVERTIME_READ_FAILED" });
      if (overtimeReadState === "denied") return json(route, 403, { outcome: "denied", ui_state: "denied", overtime: [] });
      return json(route, 200, {
        outcome: "ok",
        risk_report: {
          employee_id: url.searchParams.get("employee_id"),
          events: state.overtime.some((item) =>
            item.employee_id === url.searchParams.get("employee_id")
            && item.warning_codes_json !== "[]")
            ? [{ risk_type: "unapproved_overtime_detected" }]
            : [],
        },
      });
    }
    if (pathname === "/api/hrx/overtime") {
      const employeeId = url.searchParams.get("employee_id");
      if (method === "POST") {
        if (denyWrites) return json(route, 403, { safe_error_code: "HRX_PERMISSION_DENIED" });
        const body = request.postDataJSON();
        const attendance = state.attendance.find(
          (item) => item.employee_id === body.employee_id && item.work_date === body.work_date,
        );
        const recordedMinutes = attendance?.clock_in_at && attendance?.clock_out_at
          ? Math.round((Date.parse(attendance.clock_out_at) - Date.parse(attendance.clock_in_at)) / 60_000)
          : Number(attendance?.recorded_hours ?? 0) * 60;
        const calculatedMinutes = Math.max(0, recordedMinutes - 480);
        const overtime = {
          ...body,
          tenant_id: "tenant-a",
          hours: body.requested_minutes / 60,
          calculated_minutes: calculatedMinutes,
          approved_minutes: 0,
          state: "submitted",
          warning_codes_json: JSON.stringify(
            body.requested_minutes > calculatedMinutes
              ? ["OVERTIME_REQUEST_EXCEEDS_CALCULATED"]
              : [],
          ),
        };
        state.overtime.push(overtime);
        return json(route, 201, { outcome: "submitted", overtime: clone(overtime) });
      }
      if (overtimeReadState === "error") return json(route, 500, { safe_error_code: "HRX_OVERTIME_READ_FAILED" });
      if (overtimeReadState === "denied") return json(route, 403, { outcome: "denied", ui_state: "denied", overtime: [] });
      return json(route, 200, {
        outcome: "ok",
        overtime: overtimeReadState === "empty"
          ? []
          : clone(state.overtime.filter(
              (item) => !employeeId || item.employee_id === employeeId,
            )),
      });
    }
    const overtimeDecisionMatch = pathname.match(/^\/api\/hrx\/overtime\/([^/]+)\/(approve|reject)$/);
    if (overtimeDecisionMatch && method === "POST") {
      if (denyWrites) return json(route, 403, { safe_error_code: "HRX_PERMISSION_DENIED" });
      const overtime = state.overtime.find(
        (item) => item.overtime_id === decodeURIComponent(overtimeDecisionMatch[1]),
      );
      if (!overtime) return json(route, 404, { safe_error_code: "HRX_OVERTIME_NOT_FOUND" });
      const body = request.postDataJSON();
      const decision = overtimeDecisionMatch[2];
      overtime.state = decision === "approve" ? "approved" : "rejected";
      overtime.approved_minutes = decision === "approve" ? body.approved_minutes : 0;
      overtime.decision_reason = body.decision_reason;
      overtime.approver_id = "manager-test";
      overtime.warning_codes_json = JSON.stringify([
        ...(overtime.requested_minutes > overtime.calculated_minutes
          ? ["OVERTIME_REQUEST_EXCEEDS_CALCULATED"]
          : []),
        ...(overtime.approved_minutes > overtime.calculated_minutes
          ? ["OVERTIME_APPROVAL_EXCEEDS_CALCULATED"]
          : []),
      ]);
      return json(route, 200, {
        outcome: overtime.state,
        overtime: clone(overtime),
      });
    }
    const attendanceCorrectionDecisionMatch = pathname.match(
      /^\/api\/hrx\/attendance\/correction-requests\/([^/]+)\/(approve|reject)$/,
    );
    if (attendanceCorrectionDecisionMatch && method === "POST") {
      if (denyWrites) return json(route, 403, { safe_error_code: "HRX_PERMISSION_DENIED" });
      const correctionRequest = state.attendanceCorrectionRequests.find(
        (item) => item.correction_request_id === decodeURIComponent(attendanceCorrectionDecisionMatch[1]),
      );
      if (!correctionRequest) {
        return json(route, 404, {
          safe_error_code: "HRX_ATTENDANCE_CORRECTION_REQUEST_NOT_FOUND",
        });
      }
      const body = request.postDataJSON();
      if (correctionRequest.state !== "pending") {
        return json(route, 409, {
          safe_error_code: "HRX_ATTENDANCE_CORRECTION_ALREADY_DECIDED",
        });
      }
      if (body.expected_state_version !== correctionRequest.state_version) {
        return json(route, 409, {
          safe_error_code: "HRX_ATTENDANCE_CORRECTION_VERSION_CONFLICT",
        });
      }
      const decision = attendanceCorrectionDecisionMatch[2];
      correctionRequest.state = decision === "approve" ? "approved" : "rejected";
      correctionRequest.state_version += 1;
      correctionRequest.reviewed_by_actor_id = "manager-test";
      correctionRequest.review_reason = body.review_reason;
      correctionRequest.approved_attendance_id = decision === "approve"
        ? `att-correction:${correctionRequest.correction_request_id}`
        : null;
      let attendance = null;
      if (decision === "approve") {
        const source = state.attendance.find(
          (item) => item.attendance_id === correctionRequest.attendance_id,
        );
        attendance = {
          ...source,
          ...correctionRequest.requested_changes,
          attendance_id: correctionRequest.approved_attendance_id,
          source_ref: `AttendanceCorrectionRequest:${correctionRequest.correction_request_id}`,
          correction_of_attendance_id: source.attendance_id,
          correction_reason: correctionRequest.reason,
          source_version: `sha256:${"b".repeat(64)}`,
        };
        state.attendance.push(attendance);
      }
      return json(route, 200, {
        outcome: correctionRequest.state,
        correction_request: clone(correctionRequest),
        attendance: clone(attendance),
      });
    }
    const attendanceCorrectionRequestMatch = pathname.match(
      /^\/api\/hrx\/attendance\/([^/]+)\/correction-requests$/,
    );
    if (attendanceCorrectionRequestMatch && method === "POST") {
      if (denyWrites) return json(route, 403, { safe_error_code: "HRX_PERMISSION_DENIED" });
      const source = state.attendance.find(
        (item) => item.attendance_id === decodeURIComponent(attendanceCorrectionRequestMatch[1]),
      );
      if (!source) return json(route, 404, { safe_error_code: "HRX_ATTENDANCE_RECORD_NOT_FOUND" });
      const body = request.postDataJSON();
      const correctionRequest = {
        correction_request_id: body.correction_request_id,
        attendance_id: source.attendance_id,
        employee_id: source.employee_id,
        source_version: source.source_version,
        requested_changes: body.requested_changes,
        reason: body.reason,
        evidence_ref: body.evidence_ref ?? null,
        state: "pending",
        state_version: 1,
        requested_at: "2026-07-30T09:00:00.000Z",
        reviewed_by_actor_id: null,
        review_reason: null,
        approved_attendance_id: null,
      };
      state.attendanceCorrectionRequests.push(correctionRequest);
      return json(route, 201, {
        outcome: "requested",
        correction_request: clone(correctionRequest),
      });
    }
    if (pathname === "/api/hrx/attendance") {
      const employeeId = url.searchParams.get("employee_id");
      if (method === "POST") {
        if (denyWrites) return json(route, 403, { safe_error_code: "HRX_PERMISSION_DENIED" });
        const body = request.postDataJSON();
        const attendance = {
          ...body,
          tenant_id: "tenant-a",
          correction_of_attendance_id: null,
          source_version: `sha256:${"c".repeat(64)}`,
        };
        state.attendance.push(attendance);
        return json(route, 201, { outcome: "created", attendance: clone(attendance) });
      }
      if (attendanceReadState === "error") return json(route, 500, { safe_error_code: "HRX_ATTENDANCE_READ_FAILED" });
      if (attendanceReadState === "denied") {
        return json(route, 403, {
          outcome: "denied",
          ui_state: "denied",
          attendance: [],
          self_employee_id: "emp-1",
        });
      }
      const attendance = state.attendance.filter(
        (item) => !employeeId || item.employee_id === employeeId,
      );
      return json(route, 200, {
        outcome: "ok",
        attendance: attendanceReadState === "empty" ? [] : clone(attendance),
        self_employee_id: "emp-1",
        monthly_summary: {
          record_count: attendance.length,
          correction_count: attendance.filter((item) => item.correction_of_attendance_id).length,
        },
      });
    }

    const profileHistoryMatch = pathname.match(/^\/api\/hrx\/employees\/([^/]+)\/employment-profiles$/);
    if (profileHistoryMatch) {
      const employeeId = decodeURIComponent(profileHistoryMatch[1]);
      const asOf = url.searchParams.get("as_of") || TODAY;
      const profiles = state.profiles.get(employeeId) ?? [];
      if (method === "POST") {
        if (denyWrites) return json(route, 403, { safe_error_code: "HRX_PERMISSION_DENIED" });
        const body = request.postDataJSON();
        if (profiles.some((profile) => profile.effective_from === body.effective_from)) {
          return json(route, 409, { safe_error_code: "HRX_EMPLOYMENT_PERIOD_OVERLAP" });
        }
        const previous = [...profiles]
          .filter((profile) => profile.effective_from < body.effective_from)
          .sort((left, right) => left.effective_from.localeCompare(right.effective_from))
          .at(-1);
        if (previous) previous.effective_to = dateBefore(body.effective_from);
        const profile = {
          ...previous,
          ...body,
          profile_id: `profile-${state.profileSequence++}`,
          employee_id: employeeId,
          effective_to: null,
        };
        profiles.push(profile);
        state.profiles.set(employeeId, profiles);
      }
      const sorted = [...profiles].sort((left, right) => left.effective_from.localeCompare(right.effective_from));
      const current = currentProfile(sorted, asOf);
      return json(route, method === "POST" ? 201 : 200, {
        outcome: method === "POST" ? "created" : "ok",
        as_of: asOf,
        current,
        past: sorted.filter((profile) => profile.effective_to && profile.effective_to < asOf),
        scheduled: sorted.filter((profile) => profile.effective_from > asOf),
        employment_profiles: sorted,
        employment_profile: method === "POST" ? sorted.at(-1) : undefined,
      });
    }

    const employeeMatch = pathname.match(/^\/api\/hrx\/employees\/([^/]+)$/);
    if (employeeMatch) {
      const employeeId = decodeURIComponent(employeeMatch[1]);
      const index = state.employees.findIndex((employee) => employee.employee_id === employeeId);
      if (index === -1) return json(route, 404, { safe_error_code: "HRX_EMPLOYEE_NOT_FOUND" });
      if (method === "PATCH") {
        if (denyWrites) return json(route, 403, { safe_error_code: "HRX_PERMISSION_DENIED" });
        state.employees[index] = { ...state.employees[index], ...request.postDataJSON(), employee_id: employeeId };
        return json(route, 200, { outcome: "updated", employee: state.employees[index] });
      }
      return json(route, 200, employeeResponse(state, employeeId, url.searchParams.get("as_of") || TODAY));
    }

    if (pathname === "/api/hrx/employee-user-links") {
      const employeeId = url.searchParams.get("employee_id");
      if (method === "POST") {
        if (denyWrites) return json(route, 403, { safe_error_code: "HRX_PERMISSION_DENIED" });
        const body = request.postDataJSON();
        if (state.links.some((link) => link.user_id === body.user_id)) {
          return json(route, 409, { safe_error_code: "HRX_EMPLOYEE_USER_LINK_DUPLICATE" });
        }
        state.links.push(body);
        return json(route, 201, { outcome: "created", link: body });
      }
      return json(route, 200, {
        outcome: "ok",
        links: state.links.filter((link) => !employeeId || link.employee_id === employeeId),
        candidates: state.loginAccounts.filter(
          (account) => !state.links.some((link) => link.user_id === account.user_id),
        ),
        can_manage: true,
      });
    }

    const revokeMatch = pathname.match(/^\/api\/hrx\/employee-user-links\/([^/]+)\/revoke$/);
    if (revokeMatch) {
      if (denyWrites) return json(route, 403, { safe_error_code: "HRX_PERMISSION_DENIED" });
      const linkId = decodeURIComponent(revokeMatch[1]);
      state.links = state.links.filter((link) => link.link_id !== linkId);
      return json(route, 200, { outcome: "revoked", revoked: true });
    }

    if (pathname === "/api/hrx/org-chart") {
      return json(route, 200, orgChartResponse(state, url.searchParams.get("as_of") || TODAY));
    }

    const orgEmployeeMatch = pathname.match(/^\/api\/hrx\/org-chart\/employees\/([^/]+)$/);
    if (orgEmployeeMatch && method === "PATCH") {
      if (denyWrites) return json(route, 403, { safe_error_code: "HRX_PERMISSION_DENIED" });
      const employeeId = decodeURIComponent(orgEmployeeMatch[1]);
      const body = request.postDataJSON();
      const profiles = state.profiles.get(employeeId) ?? [];
      if (profiles.some((profile) => profile.effective_from === body.effective_from)) {
        return json(route, 409, { safe_error_code: "HRX_EMPLOYMENT_PERIOD_OVERLAP" });
      }
      const previous = currentProfile(profiles, body.effective_from);
      if (previous) previous.effective_to = dateBefore(body.effective_from);
      const profile = {
        ...previous,
        ...body,
        profile_id: `profile-${state.profileSequence++}`,
        employee_id: employeeId,
        effective_to: null,
      };
      profiles.push(profile);
      state.profiles.set(employeeId, profiles);
      return json(route, 200, {
        outcome: "updated",
        employment_profile: profile,
        org_chart: orgChartResponse(state, TODAY),
      });
    }

    if (pathname === "/api/hrx/compensation") {
      return json(route, 200, {
        outcome: "ok",
        compensation_records: [],
        masked_compensation_ref: null,
        payroll_runtime_opened: false,
      });
    }
    if (pathname === "/api/hrx/lifecycle/onboarding") {
      return json(route, 200, {
        outcome: "ok",
        onboarding: clone(state.onboarding.map((item) => ({
          ...item,
          employee_display_name: lifecycleRosterVisible
            ? state.employees.find((employee) => employee.employee_id === item.employee_id)?.display_name ?? null
            : null,
        }))),
      });
    }
    const onboardingTaskMatch = pathname.match(/^\/api\/hrx\/lifecycle\/onboarding\/([^/]+)\/tasks\/([^/]+)$/);
    if (onboardingTaskMatch && method === "POST") {
      const plan = state.onboarding.find((item) => item.onboarding_id === decodeURIComponent(onboardingTaskMatch[1]));
      const task = plan?.tasks.find((item) => item.task_id === decodeURIComponent(onboardingTaskMatch[2]));
      if (!plan || !task) return json(route, 404, { safe_error_code: "HRX_ONBOARDING_PLAN_NOT_FOUND" });
      const body = request.postDataJSON();
      if (body.retry === true) {
        task.status = "pending";
        task.attempt_count += 1;
      } else {
        task.status = body.status;
      }
      return json(route, 200, { outcome: "updated", onboarding: clone(plan) });
    }
    if (pathname === "/api/hrx/lifecycle/offboarding") {
      return json(route, 200, {
        outcome: "ok",
        offboarding: clone(state.offboarding.map((item) => ({
          ...item,
          employee_display_name: lifecycleRosterVisible
            ? state.employees.find((employee) => employee.employee_id === item.employee_id)?.display_name ?? null
            : null,
        }))),
      });
    }
    const offboardingTaskMatch = pathname.match(/^\/api\/hrx\/lifecycle\/offboarding\/([^/]+)\/tasks\/([^/]+)$/);
    if (offboardingTaskMatch && method === "POST") {
      const caseItem = state.offboarding.find((item) => item.offboarding_id === decodeURIComponent(offboardingTaskMatch[1]));
      const task = caseItem?.tasks.find((item) => item.task_id === decodeURIComponent(offboardingTaskMatch[2]));
      if (!caseItem || !task) return json(route, 404, { safe_error_code: "HRX_OFFBOARDING_CASE_NOT_FOUND" });
      const body = request.postDataJSON();
      if (body.retry === true) {
        task.status = "pending";
        task.attempt_count += 1;
      } else {
        task.status = body.status;
      }
      return json(route, 200, { outcome: "updated", offboarding: clone(caseItem) });
    }
    const offboardingCloseMatch = pathname.match(/^\/api\/hrx\/lifecycle\/offboarding\/([^/]+)\/close$/);
    if (offboardingCloseMatch && method === "POST") {
      const caseItem = state.offboarding.find((item) => item.offboarding_id === decodeURIComponent(offboardingCloseMatch[1]));
      if (!caseItem) return json(route, 404, { safe_error_code: "HRX_OFFBOARDING_CASE_NOT_FOUND" });
      if (caseItem.operational_close?.ready !== true) {
        return json(route, 409, {
          outcome: "blocked",
          safe_error_code: "HRX_OFFBOARDING_OPERATIONAL_CLOSE_BLOCKED",
          decision: clone(caseItem.operational_close),
        });
      }
      caseItem.state = "closed";
      caseItem.operational_close = {
        ...caseItem.operational_close,
        source_state: "ok",
        ready: true,
        blockers: [],
      };
      return json(route, 200, {
        outcome: "closed",
        offboarding: clone(caseItem),
        operational_close: clone(caseItem.operational_close),
        account_revocation: {
          state: "completed",
          revoked_link_ids: ["link-emp-1"],
          count: 1,
        },
      });
    }
    const conversionMatch = pathname.match(/^\/api\/hrx\/recruiting\/applications\/([^/]+)\/convert-to-employee$/);
    if (conversionMatch && method === "POST") {
      const applicationId = decodeURIComponent(conversionMatch[1]);
      const body = request.postDataJSON();
      state.conversionRequests.push(clone(body));
      const current = state.conversionReceipts.get(body.idempotency_key);
      if (current) {
        return json(route, 200, {
          outcome: "replayed",
          replayed: true,
          receipt: current,
          conversion: {
            employee: current.results.employee.value,
            employment_profile: current.results.employment_profile.value,
            employee_user_link: current.results.employee_user_link.value,
            crm_party_linked: false,
          },
        });
      }
      const receipt = {
        schema_version: "law-firm-os.hrx-candidate-conversion-receipt.v1",
        receipt_id: `candidate-conversion:${applicationId}`,
        idempotency_key: body.idempotency_key,
        candidate_id: "candidate-existing",
        application_id: applicationId,
        offer_id: "offer-existing",
        state: "completed",
        results: {
          employee: {
            outcome: "created",
            value: {
              employee_id: "emp_candidate_3ab47e1c948b1de0417a1f2d",
              display_name: "기존 지원자",
            },
          },
          employment_profile: {
            outcome: "created",
            value: {
              profile_id: "profile_candidate_3ab47e1c948b1de0417a1f2d",
              employee_id: "emp_candidate_3ab47e1c948b1de0417a1f2d",
              title: "기존 채용 건",
              org_unit_id: "group_litigation",
              manager_employee_id: "emp-1",
            },
          },
          employee_user_link: {
            outcome: "not_requested",
            value: null,
          },
        },
        crm_party_linked: false,
      };
      state.conversionReceipts.set(body.idempotency_key, receipt);
      return json(route, 201, {
        outcome: "converted",
        replayed: false,
        receipt,
        conversion: {
          employee: receipt.results.employee.value,
          employment_profile: receipt.results.employment_profile.value,
          employee_user_link: null,
          crm_party_linked: false,
        },
      });
    }
    if (pathname === "/api/hrx/recruiting/pipeline") {
      if (method === "POST") {
        state.recruitingPipelineRequests.push(clone(request.postDataJSON()));
        if (state.recruitingPipelineFailuresRemaining > 0) {
          state.recruitingPipelineFailuresRemaining -= 1;
          return json(route, 503, {
            outcome: "blocked",
            safe_error_code: "HRX_RECRUITING_PIPELINE_TRANSIENT_FAILURE",
          });
        }
        if (!state.recruitingSourceReady) {
          return json(route, 409, {
            outcome: "blocked",
            safe_error_code: "HRX_RECRUITING_SOURCE_AUTHORITY_REQUIRED",
          });
        }
        return json(route, 201, {
          outcome: "created",
          ids: {
            job_opening_id: "job-provider-created",
            candidate_id: "candidate-provider-created",
            application_id: "app-provider-created",
            interview_id: "interview-provider-created",
            offer_id: "offer-provider-created",
          },
        });
      }
      return json(route, 200, {
        capabilities: {
          pipeline_creation: {
            state: state.recruitingSourceReady ? "ready" : "integration_required",
            can_start_pipeline: state.recruitingSourceReady,
          },
        },
        job_openings: [{
          job_opening_id: "job-existing",
          title: "기존 채용 건",
          department_ref: "group_litigation",
          hiring_manager_employee_id: "emp-1",
          state: "open",
          position_count: 1,
        }],
        candidates: [{
          candidate_id: "candidate-existing",
          legal_name: "기존 지원자",
          email: "existing.candidate@example.test",
          privacy_state: "active",
          consent_expires_at: "2027-07-30",
          retention_expires_at: "2028-07-30",
          access_role_ids: ["people_ops", "hr_admin", "recruiter"],
          raw_content_included: false,
        }, ...state.recruitingCandidateAdversaries],
        applications: [{
          application_id: "app-existing",
          candidate_id: "candidate-existing",
          job_opening_id: "job-existing",
          stage: "hired",
        }, ...state.recruitingApplicationAdversaries],
        interviews: [],
        offers: [{
          offer_id: "offer-existing",
          application_id: "app-existing",
          candidate_id: "candidate-existing",
          state: "accepted",
          document_ref: "SourceDocument:offer-existing",
          compensation_ref: "CompensationRecord:offer-existing",
        }],
      });
    }
    if (pathname === "/api/hrx/people/team-operations") {
      return json(route, 200, {
        schema_version: "lawos.people-source-envelope.v1",
        state: "ok",
        as_of: "2026-07-30T09:00:00+09:00",
        timezone: "Asia/Seoul",
        source_status: [],
        data: { team_members: [], member_count: 0, action_queues: {}, response_bounds: {} },
      });
    }
    return json(route, 200, {});
  });
  await page.goto(`${baseUrl}/?view=people&ctx=allow#${section}`, { waitUntil: "networkidle" });
  await page.locator("#people-home").waitFor();
  return { page, state };
}
