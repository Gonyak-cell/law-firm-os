import { createHash } from "node:crypto";
import { listHrxMemberRosterRows } from "./hrx-member-roster-registry.js";

const BANK_ALIASES_BY_EMPLOYEE_REF = new Map([
  ["e72b1c79fcf11f443a3d347924ffc6e8a339b004c824395d756f273f2422e9e7", ["BJP"]],
  ["c1fd85d4f8d574a98a743afea034d702d3b4242a9c57ecf2c0ecad9e5cd31ad8", ["YHL"]],
  ["b6ad38508be75403e379885a95ef91c3f77da7d19ac4f8635ba328f6a6da0725", ["JWS"]],
  ["dd716f329d01a42c5d512df1aca83ca2dcec9ab2267d3ff705c6cbc475afd182", ["SMC"]],
  ["11a3b774def4adf312b81ddd715c5968c0e0c6e9293623662c535b74a101baa1", ["JHH"]],
  ["167499af06d33e69afce9bf8047ec0233c4037aecda34e3056ba83f287af103f", ["YTK"]],
  ["729b8639553bbcfd2b721efd1f8c06ab4c2e1d9c52679b64950322979548fb81", ["WSJ"]],
  ["aa36442fab185c16f790b76ef45d086acc54847bbafc8c6285928160ee30ec8b", ["SYP"]],
  ["b9d1b4b70adc55337a4814b3e6f806e2916509f9107f1bf47cf3c8d6edcead2e", ["TRY"]],
  ["77b27b7e1ce8e1673b9693fa9f9eccd9f93fd63054354e5adb2b294f92693fc8", ["YJL"]],
]);

const PAYROLL_CATEGORY_BY_EMPLOYEE_REF = new Map([
  ["167499af06d33e69afce9bf8047ec0233c4037aecda34e3056ba83f287af103f", "partner"],
  ["729b8639553bbcfd2b721efd1f8c06ab4c2e1d9c52679b64950322979548fb81", "partner"],
  ["e72b1c79fcf11f443a3d347924ffc6e8a339b004c824395d756f273f2422e9e7", "partner"],
  ["dd716f329d01a42c5d512df1aca83ca2dcec9ab2267d3ff705c6cbc475afd182", "partner"],
  ["c1fd85d4f8d574a98a743afea034d702d3b4242a9c57ecf2c0ecad9e5cd31ad8", "partner"],
  ["b6ad38508be75403e379885a95ef91c3f77da7d19ac4f8635ba328f6a6da0725", "partner"],
  ["aa36442fab185c16f790b76ef45d086acc54847bbafc8c6285928160ee30ec8b", "staff"],
  ["b9d1b4b70adc55337a4814b3e6f806e2916509f9107f1bf47cf3c8d6edcead2e", "staff"],
  ["77b27b7e1ce8e1673b9693fa9f9eccd9f93fd63054354e5adb2b294f92693fc8", "staff"],
  ["11a3b774def4adf312b81ddd715c5968c0e0c6e9293623662c535b74a101baa1", "advisor"],
]);

function employeeDirectoryRef(employeeId) {
  return createHash("sha256").update(String(employeeId ?? "").trim()).digest("hex");
}

function listRepositoryEmployees(repository, tenantId) {
  if (!repository || !tenantId) return null;
  const profilesByEmployeeId = new Map(
    repository.listEmploymentProfiles({ tenant_id: tenantId })
      .map((profile) => [profile.employee_id, profile]),
  );
  return repository.listEmployees({ tenant_id: tenantId }).map((employee) => {
    const profile = profilesByEmployeeId.get(employee.employee_id);
    return {
      ...employee,
      title: profile?.title ?? null,
      employment_type: profile?.employment_type ?? null,
      profile_status: profile?.status ?? null,
    };
  });
}

export function listAmicBankClassificationEmployees({ repository = null, tenantId = null } = {}) {
  const employees = listRepositoryEmployees(repository, tenantId) ?? listHrxMemberRosterRows();
  return Object.freeze(employees.map((employee) => {
    const employeeRef = employeeDirectoryRef(employee.employee_id);
    return Object.freeze({
      ...employee,
      aliases: Object.freeze([...(BANK_ALIASES_BY_EMPLOYEE_REF.get(employeeRef) ?? [])]),
      payroll_category: PAYROLL_CATEGORY_BY_EMPLOYEE_REF.get(employeeRef) ?? "staff",
    });
  }));
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
