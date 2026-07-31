import {
  HRX_EMPLOYEE_USER_LINK_PURPOSE,
  resolveUniqueEmployeeUserLink,
  resolveUniqueUserForEmployee,
} from "../../hrx/src/identity-link.js";

function rowsFromDirectory(directory, query = {}) {
  const rows = Array.isArray(directory)
    ? directory
    : directory?.listEmployeeUserLinks?.(query)
      ?? directory?.list?.(query)
      ?? [];
  return (Array.isArray(rows) ? rows : []).filter((row) => (
    (!query.tenant_id || row?.tenant_id === query.tenant_id)
    && (!query.employee_id || row?.employee_id === query.employee_id)
    && (!query.user_id || row?.user_id === query.user_id)
  ));
}

function employeeFromDirectory(directory, { tenant_id, employee_id } = {}) {
  if (Array.isArray(directory)) {
    return directory.find((employee) => (
      employee?.tenant_id === tenant_id && employee?.employee_id === employee_id
    )) ?? null;
  }
  return directory?.get?.({ tenant_id, employee_id }) ?? null;
}

function usersFromDirectory(directory, query = {}) {
  if (!directory) return [];
  const listed = Array.isArray(directory)
    ? directory
    : directory?.listUsers?.(query)
      ?? directory?.list?.(query);
  const direct = listed === undefined
    ? directory?.get?.({ tenant_id: query.tenant_id, user_id: query.user_id })
    : null;
  const rows = listed ?? (direct ? [direct] : []);
  return (Array.isArray(rows) ? rows : []).filter((user) => (
    (!query.tenant_id || user?.tenant_id === query.tenant_id)
    && (!query.user_id || user?.user_id === query.user_id)
  ));
}

function activeEmployee(employee) {
  return employee && !["inactive", "terminated", "offboarded"].includes(employee.status);
}

function authoritativeLoginLinks(links = []) {
  return (Array.isArray(links) ? links : []).filter((link) => (
    link?.purpose === HRX_EMPLOYEE_USER_LINK_PURPOSE
  ));
}

function resolveTenantUser({ tenant_id, user_id, users = [] } = {}) {
  const matches = (Array.isArray(users) ? users : []).filter((user) => (
    user?.tenant_id === tenant_id && user?.user_id === user_id
  ));
  if (matches.length === 0) return Object.freeze({ state: "unresolved", reason: "user_identity_missing" });
  if (matches.length !== 1) return Object.freeze({ state: "unresolved", reason: "user_identity_ambiguous" });
  if (matches[0].status && matches[0].status !== "active") {
    return Object.freeze({ state: "unresolved", reason: "user_identity_inactive" });
  }
  return Object.freeze({ state: "resolved", user: matches[0] });
}

function effectiveMember(member, asOf) {
  if (member?.status !== "active" || member?.identity_resolution_state === "unresolved") return false;
  if (typeof member.valid_from !== "string" || !Number.isFinite(Date.parse(member.valid_from))) return false;
  if (Date.parse(member.valid_from) > asOf) return false;
  if (member.valid_to && (!Number.isFinite(Date.parse(member.valid_to)) || Date.parse(member.valid_to) < asOf)) {
    return false;
  }
  return true;
}

export function resolveAuthoritativeEmployeeUserPair({
  tenant_id,
  employee_id,
  requested_user_id = null,
  employeeDirectory,
  employeeUserLinkDirectory,
  userDirectory,
} = {}) {
  const employee = employeeFromDirectory(employeeDirectory, { tenant_id, employee_id });
  if (!employee) return Object.freeze({ state: "unresolved", reason: "employee_missing" });
  if (!activeEmployee(employee)) return Object.freeze({ state: "unresolved", reason: "employee_inactive" });

  const requestedUserId = typeof requested_user_id === "string" && requested_user_id.trim()
    ? requested_user_id.trim()
    : null;
  if (
    requestedUserId
    && employeeFromDirectory(employeeDirectory, { tenant_id, employee_id: requestedUserId })
  ) {
    return Object.freeze({ state: "unresolved", reason: "employee_identifier_in_user_field" });
  }

  const links = authoritativeLoginLinks(rowsFromDirectory(employeeUserLinkDirectory, { tenant_id }));
  const byEmployee = resolveUniqueUserForEmployee({
    tenant_id,
    employee_id,
    links,
  });
  if (byEmployee.state !== "resolved") {
    return Object.freeze({ state: "unresolved", reason: byEmployee.state });
  }
  if (requestedUserId && requestedUserId !== byEmployee.user_id) {
    return Object.freeze({ state: "unresolved", reason: "employee_user_mismatch" });
  }
  const byUser = resolveUniqueEmployeeUserLink({
    tenant_id,
    user_id: byEmployee.user_id,
    links,
  });
  if (byUser.state !== "resolved" || byUser.employee_id !== employee_id) {
    return Object.freeze({
      state: "unresolved",
      reason: byUser.state === "resolved" ? "employee_user_mismatch" : byUser.state,
    });
  }
  const userIdentity = resolveTenantUser({
    tenant_id,
    user_id: byEmployee.user_id,
    users: usersFromDirectory(userDirectory, { tenant_id, user_id: byEmployee.user_id }),
  });
  if (userIdentity.state !== "resolved") return userIdentity;
  return Object.freeze({
    state: "resolved",
    employee,
    employee_id,
    user_id: byEmployee.user_id,
    link_id: byEmployee.link_id,
  });
}

export function resolveMatterTaskAssignmentIdentity({
  tenant_id,
  matter_id,
  user_id,
  as_of,
  users = null,
  members = [],
  employee_user_links = [],
  employeeDirectory = null,
} = {}) {
  const userId = typeof user_id === "string" && user_id.trim() ? user_id.trim() : null;
  const links = authoritativeLoginLinks(employee_user_links);
  if (!userId) return Object.freeze({ state: "unassigned", reason: null });
  const asOf = Date.parse(as_of);
  if (!Number.isFinite(asOf)) {
    return Object.freeze({ state: "unresolved", reason: "assignment_effective_time_invalid" });
  }
  if (
    employeeFromDirectory(employeeDirectory, { tenant_id, employee_id: userId })
    || links.some((link) => link?.tenant_id === tenant_id && link?.employee_id === userId)
  ) {
    return Object.freeze({ state: "unresolved", reason: "employee_identifier_in_user_field" });
  }
  const userIdentity = resolveTenantUser({ tenant_id, user_id: userId, users });
  if (userIdentity.state !== "resolved") return userIdentity;

  const identity = resolveUniqueEmployeeUserLink({
    tenant_id,
    user_id: userId,
    links,
  });
  if (identity.state !== "resolved") {
    return Object.freeze({ state: "unresolved", reason: identity.state });
  }
  const employee = employeeDirectory
    ? employeeFromDirectory(employeeDirectory, { tenant_id, employee_id: identity.employee_id })
    : null;
  if (employeeDirectory && !employee) {
    return Object.freeze({ state: "unresolved", reason: "employee_missing" });
  }
  if (employee && !activeEmployee(employee)) {
    return Object.freeze({ state: "unresolved", reason: "employee_inactive" });
  }
  const memberMatches = (Array.isArray(members) ? members : []).filter((member) => (
    member?.tenant_id === tenant_id
    && member?.matter_id === matter_id
    && member?.user_id === userId
    && member?.employee_id === identity.employee_id
    && effectiveMember(member, asOf)
  ));
  if (memberMatches.length === 0) {
    return Object.freeze({ state: "unresolved", reason: "matter_member_missing_or_inactive" });
  }
  if (memberMatches.length !== 1) {
    return Object.freeze({ state: "unresolved", reason: "matter_member_ambiguous" });
  }
  return Object.freeze({
    state: "resolved",
    user_id: userId,
    employee_id: identity.employee_id,
    link_id: identity.link_id,
    member_id: memberMatches[0].member_id,
  });
}

export function createMatterPeopleAssignmentAuthority({
  repository,
  employeeDirectory,
  employeeUserLinkDirectory,
  userDirectory,
  clock = () => new Date().toISOString(),
} = {}) {
  if (!repository?.list) throw new TypeError("Matter assignment authority requires repository.list");
  if (!userDirectory) throw new TypeError("Matter assignment authority requires a User directory");
  return Object.freeze({
    resolveEmployeeUserPair(input = {}) {
      return resolveAuthoritativeEmployeeUserPair({
        ...input,
        employeeDirectory,
        employeeUserLinkDirectory,
        userDirectory,
      });
    },
    resolveTaskAssignee({ tenant_id, matter_id, user_id, as_of } = {}) {
      const links = rowsFromDirectory(employeeUserLinkDirectory, { tenant_id });
      return resolveMatterTaskAssignmentIdentity({
        tenant_id,
        matter_id,
        user_id,
        as_of: as_of ?? clock(),
        members: repository.list({
          tenant_id,
          matter_id,
          model_type: "MatterMember",
        }),
        users: usersFromDirectory(userDirectory, { tenant_id, user_id }),
        employee_user_links: links,
        employeeDirectory,
      });
    },
  });
}

export function resolvePeopleAssignmentAuthority({
  member,
  employee_user_links = [],
} = {}) {
  if (member?.status !== "active") {
    return Object.freeze({ state: "not_authoritative", reason: "member_not_active" });
  }
  if (member?.role !== "responsible_attorney") {
    return Object.freeze({ state: "not_authoritative", reason: "role_not_responsible_attorney" });
  }
  if (typeof member?.employee_id === "string" && member.employee_id.trim()) {
    return Object.freeze({
      state: "authoritative",
      employee_id: member.employee_id.trim(),
      reason: "explicit_employee_id",
    });
  }
  const identity = resolveUniqueEmployeeUserLink({
    tenant_id: member?.tenant_id,
    user_id: member?.user_id,
    links: employee_user_links,
  });
  if (identity.state === "resolved") {
    return Object.freeze({
      state: "backfill_candidate",
      employee_id: identity.employee_id,
      reason: "unique_active_employee_user_link",
    });
  }
  return Object.freeze({
    state: "unresolved",
    employee_id: null,
    reason: identity.state,
  });
}

export function selectAuthoritativeAttorneyAssignments({
  tenant_id,
  members = [],
  employee_user_links = [],
} = {}) {
  return Object.freeze(
    (Array.isArray(members) ? members : [])
      .filter((member) => member?.tenant_id === tenant_id)
      .map((member) => ({
        member,
        authority: resolvePeopleAssignmentAuthority({ member, employee_user_links }),
      }))
      .filter(({ authority }) => authority.state === "authoritative")
      .map(({ member, authority }) => Object.freeze({
        tenant_id: member.tenant_id,
        matter_id: member.matter_id,
        member_id: member.member_id,
        employee_id: authority.employee_id,
        role: member.role,
        status: member.status,
      })),
  );
}
