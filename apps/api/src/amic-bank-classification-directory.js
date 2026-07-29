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

export function listAmicBankClassificationEmployees() {
  return Object.freeze(listHrxMemberRosterRows().map((employee) => Object.freeze({
    ...employee,
    aliases: Object.freeze([...(BANK_ALIASES_BY_EMPLOYEE_ID.get(employee.employee_id) ?? [])]),
  })));
}

export function listBankClassificationClientRecords(repository, tenantId) {
  if (!repository || typeof repository.list !== "function" || !tenantId) return Object.freeze([]);
  const modelTypes = ["ClientGroup", "Entity", "Person", "Organization", "Party", "PartyAlias"];
  return Object.freeze(modelTypes.flatMap((modelType) => (
    repository.list({ tenant_id: tenantId, model_type: modelType })
  )));
}
