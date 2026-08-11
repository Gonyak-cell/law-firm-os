import { rmSync } from "node:fs";

const TRANSIENT_WINDOWS_CLEANUP_ERRORS = new Set(["EBUSY", "ENOTEMPTY", "EPERM"]);

function writeCleanupWarning(warning) {
  process.stderr.write(`${JSON.stringify(warning)}\n`);
}

export function cleanupTemporaryDirectories(directories, {
  platform = process.platform,
  priorError = null,
  remove = rmSync,
  warn = writeCleanupWarning,
} = {}) {
  let cleanupError = null;

  for (const directory of directories) {
    try {
      remove(directory, {
        recursive: true,
        force: true,
        maxRetries: platform === "win32" ? 20 : 0,
        retryDelay: 100,
      });
    } catch (error) {
      const transient = platform === "win32"
        && TRANSIENT_WINDOWS_CLEANUP_ERRORS.has(error?.code);
      warn({
        warning: transient
          ? "temporary_directory_cleanup_deferred"
          : "temporary_directory_cleanup_failed",
        error_code: typeof error?.code === "string" ? error.code : "UNKNOWN",
      });
      if (!transient && cleanupError === null) cleanupError = error;
    }
  }

  if (cleanupError && !priorError) throw cleanupError;
}
