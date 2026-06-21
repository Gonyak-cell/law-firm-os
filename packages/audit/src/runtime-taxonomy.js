export const RUNTIME_AUDIT_EVENT_SCHEMA_VERSION = "law-firm-os.runtime-audit-event.v0.1";

export const RUNTIME_AUDIT_ACTIONS = Object.freeze({
  READ: "runtime.read",
  WRITE: "runtime.write",
  PERMISSION_EVALUATE: "permission.evaluate",
  EXPORT: "runtime.export",
  SHARE: "runtime.share",
  AUDIT_READ: "audit.read",
  RETENTION_EVALUATE: "retention.evaluate"
});

export function classifyAuditAction(action) {
  if (action?.includes("permission")) return "permission";
  if (action?.includes("export")) return "export";
  if (action?.includes("share")) return "share";
  if (action?.startsWith("audit.")) return "audit";
  if (action?.includes("write") || action?.includes("create") || action?.includes("update")) return "write";
  return "read";
}
