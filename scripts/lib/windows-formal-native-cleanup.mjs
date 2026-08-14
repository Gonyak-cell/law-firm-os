import path from "node:path";

export async function cleanupFailedWindowsNsisInstallation({
  installDir,
  priorError = null,
  exists,
  list,
  executeLocked,
  waitForRemoval,
  warn = () => {},
} = {}) {
  if (typeof exists !== "function" || typeof list !== "function"
    || typeof executeLocked !== "function" || typeof waitForRemoval !== "function") {
    throw new TypeError("Windows NSIS cleanup adapters with locked execution are required");
  }
  const executablePath = path.join(installDir, "matter.exe");
  if (!exists(executablePath)) {
    return Object.freeze({ attempted: false, completed: true, residue_present: false, error_code: null });
  }

  let cleanupError = null;
  let uninstallerPath = null;
  let uninstallerReceipt = null;
  try {
    const uninstallerName = list(installDir).find((name) => /^uninstall.*\.exe$/iu.test(name));
    if (!uninstallerName) throw Object.assign(new Error("NSIS uninstaller is missing"), { code: "UNINSTALLER_MISSING" });
    uninstallerPath = path.join(installDir, uninstallerName);
    uninstallerReceipt = await executeLocked(uninstallerPath, ["/S"]);
    await waitForRemoval(executablePath);
  } catch (error) {
    cleanupError = error;
  }
  const residuePresent = exists(executablePath);
  const resultValue = {
    attempted: true,
    completed: cleanupError === null && !residuePresent,
    residue_present: residuePresent,
    error_code: cleanupError
      ? (typeof cleanupError.code === "string" ? cleanupError.code : "UNKNOWN")
      : (residuePresent ? "EXECUTABLE_RESIDUE" : null),
    uninstaller_found: uninstallerPath !== null,
  };
  if (uninstallerReceipt && typeof uninstallerReceipt === "object") {
    resultValue.uninstaller = uninstallerReceipt;
  }
  const result = Object.freeze(resultValue);
  if (!result.completed) warn({ warning: "windows_nsis_failure_cleanup_incomplete", ...result });
  if (priorError && typeof priorError === "object") {
    Object.defineProperty(priorError, "windows_nsis_cleanup", {
      configurable: true,
      enumerable: true,
      value: result,
    });
    return result;
  }
  if (!result.completed) {
    throw cleanupError ?? Object.assign(new Error("Windows NSIS cleanup left executable residue"), {
      code: result.error_code,
    });
  }
  return result;
}
