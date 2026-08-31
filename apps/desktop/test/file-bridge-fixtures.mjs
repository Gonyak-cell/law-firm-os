import { resolve } from "node:path";

export const OWNER_A = Object.freeze({ ownerId: "renderer-owner-a" });
export const OWNER_B = Object.freeze({ ownerId: "renderer-owner-b" });
export const TEST_FILE_PATH = resolve("test-fixtures", "settlement.xlsx");

export function regularStat(overrides = {}) {
  return {
    size: 4096,
    mtimeMs: 123456,
    dev: 7,
    ino: 11,
    isFile: () => true,
    isSymbolicLink: () => false,
    ...overrides
  };
}

export function allowedPermissionClient({ maxUploadBytes = 16 * 1024 * 1024 } = {}) {
  return {
    calls: [],
    async precheckFileBridgeAction(request) {
      this.calls.push(request);
      return {
        allowed: true,
        operationId: "operation-001",
        maxUploadBytes
      };
    }
  };
}

export function fakeDialog(filePath = TEST_FILE_PATH) {
  return {
    openCalls: [],
    saveCalls: [],
    async showOpenDialog(options) {
      this.openCalls.push(options);
      return { canceled: false, filePaths: [filePath] };
    },
    async showSaveDialog(options) {
      this.saveCalls.push(options);
      return { canceled: false, filePath: resolve("test-output", "vault-export.pdf") };
    }
  };
}

export async function precheckAndChoose(controller, {
  owner = OWNER_A,
  matterId = "matter_001",
  workspaceId = "workspace_001"
} = {}) {
  const preflight = await controller.precheckUpload({ matterId, workspaceId }, owner);
  return controller.chooseFileForUpload({
    preflightId: preflight.preflightId,
    userActivation: true
  }, owner);
}

export function inactiveTimer() {
  return { unref() {} };
}
