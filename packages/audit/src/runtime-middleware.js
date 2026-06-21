import { createRuntimeAuditWriter } from "./runtime-writer.js";

export function createRuntimeAuditMiddleware({ writer = createRuntimeAuditWriter() } = {}) {
  return Object.freeze({
    recordRead(input = {}) {
      return writer.append({ ...input, action: input.action ?? "runtime.read" });
    },
    recordWrite(input = {}) {
      return writer.append({ ...input, action: input.action ?? "runtime.write" });
    },
    recordPermission(input = {}) {
      return writer.append({ ...input, action: input.action ?? "permission.evaluate" });
    },
    recordExport(input = {}) {
      return writer.append({ ...input, action: input.action ?? "runtime.export" });
    }
  });
}
