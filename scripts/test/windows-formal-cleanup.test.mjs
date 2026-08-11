import assert from "node:assert/strict";
import test from "node:test";
import { cleanupTemporaryDirectories } from "../lib/windows-formal-cleanup.mjs";

function filesystemError(code) {
  return Object.assign(new Error(code), { code });
}

test("Windows transient cleanup errors are retried and deferred without failing QA", () => {
  for (const code of ["EBUSY", "ENOTEMPTY", "EPERM"]) {
    const warnings = [];
    let options;

    assert.doesNotThrow(() => cleanupTemporaryDirectories(["temporary-directory"], {
      platform: "win32",
      remove(_directory, receivedOptions) {
        options = receivedOptions;
        throw filesystemError(code);
      },
      warn: (warning) => warnings.push(warning),
    }));

    assert.deepEqual(options, {
      recursive: true,
      force: true,
      maxRetries: 20,
      retryDelay: 100,
    });
    assert.deepEqual(warnings, [{
      warning: "temporary_directory_cleanup_deferred",
      error_code: code,
    }]);
  }
});

test("non-transient cleanup errors fail an otherwise successful QA run", () => {
  const cleanupError = filesystemError("EIO");

  assert.throws(() => cleanupTemporaryDirectories(["temporary-directory"], {
    platform: "win32",
    remove() {
      throw cleanupError;
    },
    warn() {},
  }), (error) => error === cleanupError);
});

test("cleanup errors never replace an existing QA failure", () => {
  const primaryError = new Error("PRIMARY_QA_FAILURE");
  const cleanupError = filesystemError("EIO");
  const warnings = [];

  assert.throws(() => {
    let priorError = null;
    try {
      throw primaryError;
    } catch (error) {
      priorError = error;
      throw error;
    } finally {
      cleanupTemporaryDirectories(["temporary-directory"], {
        platform: "win32",
        priorError,
        remove() {
          throw cleanupError;
        },
        warn: (warning) => warnings.push(warning),
      });
    }
  }, (error) => error === primaryError);

  assert.deepEqual(warnings, [{
    warning: "temporary_directory_cleanup_failed",
    error_code: "EIO",
  }]);
});
