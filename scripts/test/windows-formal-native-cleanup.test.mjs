import assert from "node:assert/strict";
import test from "node:test";
import { cleanupFailedWindowsNsisInstallation } from "../lib/windows-formal-native-cleanup.mjs";

function fixture({ fail = false, missingUninstaller = false } = {}) {
  const state = { executable: true, calls: [], warnings: [] };
  return {
    state,
    options: {
      installDir: "C:/runner/matter-test",
      exists: () => state.executable,
      list: () => missingUninstaller ? [] : ["Uninstall matter.exe"],
      executeLocked: async (file, args) => {
        state.calls.push({ file, args });
        if (fail) throw Object.assign(new Error("uninstall failed"), { code: "UNINSTALL_FAILED" });
        state.executable = false;
        return {
          installed_tree_path: "./Uninstall matter.exe",
          installed_tree_sha256: "a".repeat(64),
          sha256: "b".repeat(64),
          uninstaller_bytes: 1234,
          lock_mode: "FileShare.Read",
          denies_write_delete: true,
          authenticode_valid: true,
          process: { pid: 101, path_identity: "pid_executable_path" },
          exit_code: 0,
        };
      },
      waitForRemoval: () => {
        if (state.executable) throw Object.assign(new Error("residue"), { code: "EXECUTABLE_RESIDUE" });
      },
      warn: (warning) => state.warnings.push(warning),
    },
  };
}

test("failure cleanup invokes the locked NSIS uninstaller and preserves the primary error", async () => {
  const input = fixture();
  const primary = new Error("PRIMARY_QA_FAILURE");
  const result = await cleanupFailedWindowsNsisInstallation({ ...input.options, priorError: primary });
  assert.equal(result.completed, true);
  assert.equal(result.residue_present, false);
  assert.deepEqual(input.state.calls, [{ file: "C:/runner/matter-test/Uninstall matter.exe", args: ["/S"] }]);
  assert.equal(result.uninstaller.lock_mode, "FileShare.Read");
  assert.equal(result.uninstaller.process.path_identity, "pid_executable_path");
  assert.equal(primary.message, "PRIMARY_QA_FAILURE");
  assert.deepEqual(primary.windows_nsis_cleanup, result);
});

test("cleanup failure never replaces the primary error and records executable residue", async () => {
  const input = fixture({ fail: true });
  const primary = new Error("PRIMARY_QA_FAILURE");
  const result = await cleanupFailedWindowsNsisInstallation({ ...input.options, priorError: primary });
  assert.equal(result.completed, false);
  assert.equal(result.residue_present, true);
  assert.equal(result.error_code, "UNINSTALL_FAILED");
  assert.deepEqual(primary.windows_nsis_cleanup, result);
  assert.equal(input.state.warnings.length, 1);
});

test("missing NSIS uninstaller fails an otherwise successful flow", async () => {
  const input = fixture({ missingUninstaller: true });
  await assert.rejects(
    () => cleanupFailedWindowsNsisInstallation(input.options),
    (error) => error.code === "UNINSTALLER_MISSING",
  );
  assert.equal(input.state.executable, true);
});

test("cleanup is not attempted when no installed executable exists", async () => {
  const input = fixture();
  input.state.executable = false;
  assert.deepEqual(await cleanupFailedWindowsNsisInstallation(input.options), {
    attempted: false,
    completed: true,
    residue_present: false,
    error_code: null,
  });
  assert.deepEqual(input.state.calls, []);
});
