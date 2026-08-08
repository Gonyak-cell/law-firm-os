import {
  DOCX_GENERATOR_VERSION,
  freezeDeep,
  hashValue,
  requiredString,
  safeText,
} from "./document-builder-values.js";

const IDENTIFIER = /^[a-z][a-z0-9_]{0,63}$/;
const VERSION = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

function identifier(value, field) {
  const text = requiredString(value, field, { max: 64 });
  if (!IDENTIFIER.test(text)) throw new TypeError(`${field} is invalid`);
  return text;
}

function templateVersion(value) {
  const text = requiredString(value, "template_version", { max: 64 });
  if (!VERSION.test(text)) throw new TypeError("template_version is invalid");
  return text;
}

function normalizeRun(run, mergeKeys) {
  if (!run || typeof run !== "object" || Array.isArray(run)) throw new TypeError("template run is invalid");
  const sources = ["literal", "merge_field"].filter((key) => run[key] !== undefined);
  if (sources.length !== 1) throw new TypeError("template run must have exactly one content source");
  if (run.literal !== undefined) return { literal: safeText(run.literal, "literal", { max: 2_000 }) };
  const key = identifier(run.merge_field, "merge_field");
  if (!mergeKeys.has(key)) throw new TypeError(`merge field is not declared: ${key}`);
  return { merge_field: key };
}

function normalizeRuns(runs, mergeKeys, field = "runs") {
  if (!Array.isArray(runs) || runs.length === 0) throw new TypeError(`${field} is required`);
  return runs.map((run) => normalizeRun(run, mergeKeys));
}

function normalizeContent(content, mergeKeys, signerRoles) {
  if (!Array.isArray(content) || content.length === 0) throw new TypeError("content is required");
  const anchorIds = new Set();
  const roleAnchors = new Map();
  const blocks = content.map((block) => {
    if (!block || typeof block !== "object" || Array.isArray(block)) throw new TypeError("template content block is invalid");
    if (block.type === "paragraph") {
      const style = block.style === undefined ? "body" : requiredString(block.style, "paragraph style", { max: 32 });
      if (!["title", "heading", "body"].includes(style)) throw new TypeError("paragraph style is invalid");
      return { type: "paragraph", style, runs: normalizeRuns(block.runs, mergeKeys) };
    }
    if (block.type === "table") {
      if (!Array.isArray(block.rows) || !block.rows.length) throw new TypeError("table rows are required");
      const width = block.rows[0]?.length;
      if (![1, 2].includes(width)) throw new TypeError("table must have one or two columns");
      const rows = block.rows.map((row) => {
        if (!Array.isArray(row) || row.length !== width) throw new TypeError("table rows must have equal column counts");
        return row.map((cell) => normalizeRuns(cell, mergeKeys, "table cell"));
      });
      return { type: "table", rows };
    }
    if (block.type !== "signature_anchor") {
      throw new TypeError(`template content type is unsupported: ${String(block.type ?? "")}`);
    }
    const roleId = identifier(block.signer_role, "signer_role");
    const anchorId = identifier(block.anchor_id, "anchor_id");
    if (!signerRoles.has(roleId)) throw new TypeError(`signature anchor references unknown signer role: ${roleId}`);
    if (anchorIds.has(anchorId)) throw new TypeError(`signature anchor is duplicated: ${anchorId}`);
    anchorIds.add(anchorId);
    roleAnchors.set(roleId, (roleAnchors.get(roleId) ?? 0) + 1);
    return { type: "signature_anchor", signer_role: roleId, anchor_id: anchorId, label: safeText(block.label ?? "서명", "signature label", { max: 80 }) };
  });
  for (const [roleId, role] of signerRoles) {
    if (roleAnchors.get(roleId) !== 1) {
      const prefix = role.required ? "required " : "";
      throw new TypeError(`${prefix}signer role must have exactly one unique signature anchor: ${roleId}`);
    }
  }
  return blocks;
}

export function parseApprovedDocumentTemplateVersion(input = {}, { persisted = false } = {}) {
  if (input.status !== "approved") throw new TypeError("approved template status is required");
  const tenantId = requiredString(input.tenant_id, "tenant_id", { max: 128 });
  const templateId = identifier(input.template_id, "template_id");
  const version = templateVersion(input.template_version);
  const mergeKeys = new Set();
  if (!Array.isArray(input.merge_schema) || !input.merge_schema.length) throw new TypeError("merge_schema is required");
  const mergeSchema = input.merge_schema.map((field) => {
    const key = identifier(field?.key, "merge field key");
    if (mergeKeys.has(key)) throw new TypeError(`merge field is duplicated: ${key}`);
    mergeKeys.add(key);
    const maxLength = Number(field.max_length ?? 4_000);
    if (!Number.isInteger(maxLength) || maxLength < 1 || maxLength > 20_000) throw new TypeError(`merge field max_length is invalid: ${key}`);
    return { key, required: field.required !== false, max_length: maxLength };
  });
  if (!Array.isArray(input.signer_roles) || !input.signer_roles.length) throw new TypeError("signer_roles is required");
  const signerRoles = new Map();
  for (const role of input.signer_roles) {
    const roleId = identifier(role?.role_id, "signer role");
    if (signerRoles.has(roleId)) throw new TypeError(`signer role is duplicated: ${roleId}`);
    signerRoles.set(roleId, { role_id: roleId, required: role.required !== false });
  }
  const authoritative = {
    tenant_id: tenantId,
    template_id: templateId,
    template_version: version,
    label: safeText(input.label, "label", { max: 120 }),
    merge_schema: mergeSchema,
    signer_roles: [...signerRoles.values()],
    content: normalizeContent(input.content, mergeKeys, signerRoles),
    generator_version: DOCX_GENERATOR_VERSION,
  };
  const templateHash = hashValue(authoritative);
  if ((persisted || input.template_hash !== undefined) && input.template_hash !== templateHash) {
    throw new TypeError("persisted template hash does not match canonical template");
  }
  const receipt = input.approval_receipt;
  const receiptHash = receipt?.template_hash;
  if ((persisted || receiptHash !== undefined) && receiptHash !== templateHash) {
    throw new TypeError("approval receipt template hash does not match approved template");
  }
  const receiptPayload = {
    receipt_id: requiredString(receipt?.receipt_id, "approval_receipt.receipt_id", { max: 160 }),
    approved_by_ref: requiredString(receipt?.approved_by_ref, "approval_receipt.approved_by_ref", { max: 160 }),
    approved_at: new Date(requiredString(receipt?.approved_at, "approval_receipt.approved_at", { max: 40 })).toISOString(),
    template_hash: templateHash,
  };
  const canonicalReceiptHash = hashValue(receiptPayload);
  if ((persisted || receipt?.receipt_hash !== undefined) && receipt?.receipt_hash !== canonicalReceiptHash) {
    throw new TypeError("approval receipt hash does not match canonical receipt");
  }
  const approvalReceipt = { ...receiptPayload, receipt_hash: canonicalReceiptHash };
  return freezeDeep({
    model_type: "MatterDocumentTemplateVersion",
    resource_id: `${templateId}:${version}`,
    ...authoritative,
    category: "document",
    status: "approved",
    approval_receipt: approvalReceipt,
    template_hash: templateHash,
    synthetic_only: input.synthetic_only === true,
    immutable: true,
    raw_template_body_included: false,
  });
}

export function createApprovedDocumentTemplateVersion(input = {}) {
  return parseApprovedDocumentTemplateVersion(input);
}

export function persistApprovedTemplateVersion(repository, input) {
  const candidate = parseApprovedDocumentTemplateVersion(input, { persisted: true });
  const ref = { tenant_id: candidate.tenant_id, model_type: candidate.model_type, resource_id: candidate.resource_id };
  const existing = repository.get(ref);
  if (existing) {
    const canonicalExisting = parseApprovedDocumentTemplateVersion(existing, { persisted: true });
    if (canonicalExisting.template_hash !== candidate.template_hash) throw new Error(`approved template version is immutable: ${candidate.resource_id}`);
    if (canonicalExisting.approval_receipt.receipt_hash !== candidate.approval_receipt.receipt_hash) {
      throw new Error(`approved template receipt is immutable: ${candidate.resource_id}`);
    }
    return canonicalExisting;
  }
  return parseApprovedDocumentTemplateVersion(repository.create(candidate), { persisted: true });
}

export function readApprovedTemplateVersion(repository, { tenant_id, template_id, template_version } = {}) {
  const tenantId = requiredString(tenant_id, "tenant_id", { max: 128 });
  const templateId = identifier(template_id, "template_id");
  const version = templateVersion(template_version);
  const stored = repository.get({ tenant_id: tenantId, model_type: "MatterDocumentTemplateVersion", resource_id: `${templateId}:${version}` });
  if (!stored) throw new Error("approved template version not found");
  const canonical = parseApprovedDocumentTemplateVersion(stored, { persisted: true });
  if (canonical.tenant_id !== tenantId || canonical.template_id !== templateId || canonical.template_version !== version) {
    throw new Error("approved template authority does not match requested identity");
  }
  return canonical;
}

export function listApprovedTemplateVersions(repository, tenant_id) {
  const tenantId = requiredString(tenant_id, "tenant_id", { max: 128 });
  return Object.freeze(repository.list({ tenant_id: tenantId, model_type: "MatterDocumentTemplateVersion" })
    .map((stored) => parseApprovedDocumentTemplateVersion(stored, { persisted: true })));
}
