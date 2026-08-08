import {
  freezeDeep,
  hashValue,
  requiredString,
  safeText,
} from "./document-builder-values.js";
import { parseApprovedDocumentTemplateVersion } from "./document-template-authority.js";

const IDENTIFIER = /^[a-z][a-z0-9_]{0,63}$/;

function identifier(value, field) {
  const text = requiredString(value, field, { max: 64 });
  if (!IDENTIFIER.test(text)) throw new TypeError(`${field} is invalid`);
  return text;
}

export function canonicalizeAgreementInput(input = {}, { requireComplete = true } = {}) {
  const template = parseApprovedDocumentTemplateVersion(input.template, { persisted: true });
  const supplied = input.merge_data && typeof input.merge_data === "object" && !Array.isArray(input.merge_data)
    ? input.merge_data
    : {};
  const allowed = new Set(template.merge_schema.map((field) => field.key));
  for (const key of Object.keys(supplied)) {
    if (!allowed.has(key)) throw new TypeError(`merge field is not declared: ${key}`);
  }
  const mergeData = {};
  for (const field of template.merge_schema) {
    const value = supplied[field.key];
    if (value === undefined || value === null || String(value).trim() === "") {
      if (requireComplete && field.required) throw new TypeError(`merge field is required: ${field.key}`);
      continue;
    }
    mergeData[field.key] = safeText(value, `merge field ${field.key}`, { max: field.max_length });
  }
  const knownRoles = new Set(template.signer_roles.map((role) => role.role_id));
  const seenRoles = new Set();
  const signerRoleRefs = [];
  for (const ref of Array.isArray(input.signer_role_refs) ? input.signer_role_refs : []) {
    const roleId = identifier(ref?.role_id, "signer role");
    if (!knownRoles.has(roleId)) throw new TypeError(`signer role is not declared: ${roleId}`);
    if (seenRoles.has(roleId)) throw new TypeError(`signer role is duplicated: ${roleId}`);
    seenRoles.add(roleId);
    signerRoleRefs.push({ role_id: roleId, party_ref: requiredString(ref?.party_ref, "party_ref", { max: 200 }) });
  }
  if (requireComplete) {
    for (const role of template.signer_roles) {
      if (role.required && !seenRoles.has(role.role_id)) throw new TypeError(`signer role is required: ${role.role_id}`);
    }
  }
  const canonical = {
    tenant_id: requiredString(input.tenant_id, "tenant_id", { max: 128 }),
    matter_id: requiredString(input.matter_id, "matter_id", { max: 128 }),
    draft_id: requiredString(input.draft_id, "draft_id", { max: 128 }),
    title: safeText(input.title ?? template.label, "title", { max: 240 }),
    template_id: template.template_id,
    template_version: template.template_version,
    template_hash: template.template_hash,
    merge_data: mergeData,
    signer_role_refs: signerRoleRefs.sort((left, right) => left.role_id.localeCompare(right.role_id)),
    generated_at: new Date(requiredString(input.generated_at, "generated_at", { max: 40 })).toISOString(),
  };
  return freezeDeep({ ...canonical, input_hash: hashValue(canonical) });
}

export function canonicalDraftData({ tenantId, matterId, draftId, title, template, mergeData, signerRoleRefs }) {
  const canonical = canonicalizeAgreementInput({
    tenant_id: tenantId,
    matter_id: matterId,
    draft_id: draftId,
    title,
    template,
    merge_data: mergeData,
    signer_role_refs: signerRoleRefs,
    generated_at: "1980-01-01T00:00:00.000Z",
  }, { requireComplete: false });
  const { generated_at: _generatedAt, input_hash: _inputHash, ...fingerprintInput } = canonical;
  return freezeDeep({
    merge_data: canonical.merge_data,
    signer_role_refs: canonical.signer_role_refs,
    input_fingerprint: hashValue(fingerprintInput),
  });
}
