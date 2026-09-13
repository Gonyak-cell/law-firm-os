import { profileError } from "../../../packages/master-data/src/person-profile-service.js";
import { createPersonPhotoStorage } from "../../../packages/master-data/src/person-photo-storage.js";

// Compatibility join at the API composition boundary. Legacy employee storage is retained;
// canonical fields are never copied back into HRX by an employee update.
export function withCanonicalPersonProfiles(context, people, portal, storage) {
  if (!context?.repository || !people) return context;
  const repository = context.repository;
  function personById(tenantId, personId) {
    const matches = people.list({ tenant_id: tenantId, model_type: "Person" })
      .filter(row => row.person_id === personId);
    if (matches.length !== 1) throw profileError("PROFILE_ROLE_LINK_CONFLICT", 409);
    return matches[0];
  }
  function personFor(employee) {
    if (!employee) return null;
    const links = repository.listEmployeeUserLinks({ tenant_id: employee.tenant_id, employee_id: employee.employee_id });
    if (links.length > 1) throw profileError("PROFILE_ROLE_LINK_CONFLICT", 409);
    if (employee.person_id) {
      const person = personById(employee.tenant_id, employee.person_id);
      const userLinks = person.account_user_id
        ? repository.listEmployeeUserLinks({ tenant_id: employee.tenant_id, user_id: person.account_user_id })
        : [];
      if ((links.length === 1 && links[0].user_id !== person.account_user_id)
        || userLinks.some(link => link.employee_id !== employee.employee_id)
        || portal?.list({ tenant_id: employee.tenant_id, model_type: "ExternalUser" })
          .some(row => row.user_id === person.account_user_id)) {
        throw profileError("PROFILE_ROLE_LINK_CONFLICT", 409);
      }
      return person;
    }
    if (!links.length) return null;
    const user_id = links[0].user_id;
    if (repository.listEmployeeUserLinks({ tenant_id: employee.tenant_id, user_id }).length !== 1
      || portal?.list({ tenant_id: employee.tenant_id, model_type: "ExternalUser" }).some(row => row.user_id === user_id)) {
      throw profileError("PROFILE_ROLE_LINK_CONFLICT", 409);
    }
    const matches = people.list({ tenant_id: employee.tenant_id, model_type: "Person" }).filter(row => row.account_user_id === user_id);
    if (matches.length > 1 || (employee.person_id && employee.person_id !== matches[0]?.person_id)) throw profileError("PROFILE_ROLE_LINK_CONFLICT", 409);
    return matches[0] ?? null;
  }
  function employeeView(employee) {
    const person = personFor(employee);
    if (!person) return employee;
    const optionalString = value => typeof value === "string" && value.trim() ? value : null;
    const view = { ...employee, person_id: person.person_id, display_name: person.display_name,
      legal_name: optionalString(person.legal_name), mobile_phone: optionalString(person.mobile_phone),
      work_email: optionalString(person.email), professional_profile: person.professional_profile,
      profile_photo: person.profile_photo };
    if (person.profile_photo) for (const key of Object.keys(view)) if (key.startsWith("photo_")) delete view[key];
    return view;
  }
  function employmentView(profile) {
    if (!profile) return profile;
    const person = personFor(repository.getEmployee({ tenant_id: profile.tenant_id, employee_id: profile.employee_id }));
    return person ? { ...profile, person_id: person.person_id } : profile;
  }
  function ownedPatch(current, patch, fields) {
    const next = { ...patch };
    if (Object.hasOwn(patch, "person_id")) {
      if (!current?.person_id || patch.person_id !== current.person_id) throw profileError("PROFILE_ROLE_LINK_CONFLICT", 409);
      delete next.person_id;
    }
    if (!current?.person_id) return next;
    for (const key of fields) {
      if (key in patch && JSON.stringify(patch[key] ?? null) !== JSON.stringify(current[key] ?? null)) throw profileError("PERSON_PROFILE_OWNER_REQUIRED", 409);
      delete next[key];
    }
    delete next.person_id;
    return next;
  }
  return { ...context, personPhotoStorage: storage ? { readPhoto: input => createPersonPhotoStorage({ storage }).readPhoto(input) } : null, repository: { ...repository,
    ...(typeof repository.transaction === "function" ? { transaction: callback => repository.transaction(tx =>
      callback(withCanonicalPersonProfiles({ ...context, repository: tx }, people, portal, storage).repository)) } : {}),
    getEmployee: ref => employeeView(repository.getEmployee(ref)),
    listEmployees: query => repository.listEmployees(query).map(employeeView),
    getEmploymentProfile: ref => employmentView(repository.getEmploymentProfile(ref)),
    listEmploymentProfiles: query => repository.listEmploymentProfiles(query).map(employmentView),
    createEmployee(input) {
      if (input.person_id) personById(input.tenant_id, input.person_id);
      return employeeView(repository.createEmployee(input));
    },
    updateEmployee(ref, patch) {
      const current = employeeView(repository.getEmployee(ref));
      return employeeView(repository.updateEmployee(ref, ownedPatch(current, patch, ["display_name", "legal_name", "work_email", "mobile_phone", "professional_profile", "profile_photo",
        "photo_object_id", "photo_sha256", "photo_byte_size", "photo_content_type", "photo_version_id"])));
    },
    updateEmploymentProfile(ref, patch) {
      const current = employmentView(repository.getEmploymentProfile(ref));
      return employmentView(repository.updateEmploymentProfile(ref, ownedPatch(current, patch, ["professional_profile"])));
    },
    createEmploymentProfile(input) {
      const employee = repository.getEmployee({ tenant_id: input.tenant_id, employee_id: input.employee_id });
      const person = personFor(employee);
      if (input.person_id && person?.person_id && input.person_id !== person.person_id) throw profileError("PROFILE_ROLE_LINK_CONFLICT", 409);
      const owner = person ? { ...employee, person_id: person.person_id } : employee;
      const next = ownedPatch(owner, input, []);
      if (person) delete next.professional_profile;
      return employmentView(repository.createEmploymentProfile({ ...next, ...(person ? { person_id: person.person_id } : {}) }));
    },
    createEmployeeUserLink(input) {
      const employee = repository.getEmployee({ tenant_id: input.tenant_id, employee_id: input.employee_id });
      if (employee?.person_id && personById(input.tenant_id, employee.person_id).account_user_id !== input.user_id) {
        throw profileError("PROFILE_ROLE_LINK_CONFLICT", 409);
      }
      if (repository.listEmployeeUserLinks({ tenant_id: input.tenant_id, user_id: input.user_id }).length
        || repository.listEmployeeUserLinks({ tenant_id: input.tenant_id, employee_id: input.employee_id }).length
        || portal?.list({ tenant_id: input.tenant_id, model_type: "ExternalUser" }).some(row => row.user_id === input.user_id)) {
        throw profileError("PROFILE_ROLE_LINK_CONFLICT", 409);
      }
      return repository.createEmployeeUserLink(input);
    },
  } };
}
