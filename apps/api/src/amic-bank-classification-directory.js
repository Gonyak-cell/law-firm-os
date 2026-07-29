import { listHrxMemberRosterRows } from "./hrx-member-roster-registry.js";

const BANK_ALIASES_BY_EMPLOYEE_ID = new Map([
  ["emp_amic_bj_park", ["BJP"]],
  ["emp_amic_yhlim", ["YHL"]],
  ["emp_amic_jwsuh", ["JWS"]],
  ["emp_amic_smcho", ["SMC"]],
  ["emp_amic_jhhan", ["JHH"]],
  ["emp_amic_ytkim", ["YTK"]],
  ["emp_amic_wsjo", ["WSJ"]],
  ["emp_amic_sypark", ["SYP"]],
  ["emp_amic_tryoon", ["TRY"]],
  ["emp_amic_yjlee", ["YJL"]],
]);

const PAYROLL_CATEGORY_BY_EMPLOYEE_ID = new Map([
  ["emp_amic_ytkim", "partner"],
  ["emp_amic_wsjo", "partner"],
  ["emp_amic_bj_park", "partner"],
  ["emp_amic_smcho", "partner"],
  ["emp_amic_yhlim", "partner"],
  ["emp_amic_jwsuh", "partner"],
  ["emp_amic_sypark", "staff"],
  ["emp_amic_tryoon", "staff"],
  ["emp_amic_yjlee", "staff"],
  ["emp_amic_jhhan", "advisor"],
]);

export function listAmicBankClassificationEmployees() {
  return Object.freeze(listHrxMemberRosterRows().map((employee) => Object.freeze({
    ...employee,
    aliases: Object.freeze([...(BANK_ALIASES_BY_EMPLOYEE_ID.get(employee.employee_id) ?? [])]),
    payroll_category: PAYROLL_CATEGORY_BY_EMPLOYEE_ID.get(employee.employee_id) ?? "staff",
  })));
}

function matterClientAsClientGroup(record) {
  const displayName = record.client_display_name
    ?? record.display_name
    ?? record.client_name
    ?? record.client_short_name
    ?? record.client_id;
  return Object.freeze({
    model_type: "ClientGroup",
    tenant_id: record.tenant_id,
    client_group_id: record.client_group_id ?? record.client_id,
    display_name: displayName,
    canonical_display_name: displayName,
    aliases: Object.freeze([
      ...new Set([record.client_display_name, record.client_short_name, displayName].filter(Boolean)),
    ]),
    status: record.status ?? "active",
  });
}

export function listBankClassificationClientRecords(repository, tenantId, matterRepository = null) {
  if (!tenantId) return Object.freeze([]);
  const modelTypes = ["ClientGroup", "Entity", "Person", "Organization", "Party", "PartyAlias"];
  const masterDataRecords = repository && typeof repository.list === "function"
    ? modelTypes.flatMap((modelType) => repository.list({ tenant_id: tenantId, model_type: modelType }))
    : [];
  const masterDataClientIds = new Set(masterDataRecords
    .filter((record) => record.model_type === "ClientGroup")
    .map((record) => record.client_group_id));
  const matterClients = matterRepository && typeof matterRepository.list === "function"
    ? matterRepository
      .list({ tenant_id: tenantId, model_type: "MatterClient" })
      .filter((record) => record.client_id && !masterDataClientIds.has(record.client_id))
      .map(matterClientAsClientGroup)
    : [];
  return Object.freeze([...masterDataRecords, ...matterClients]);
}
