import { POSIX_PYTHON_BASE } from "./desktop-installed-outlook-source-envelope-posix-python-base.mjs";
import { POSIX_PYTHON_ENTRY } from "./desktop-installed-outlook-source-envelope-posix-python-entry.mjs";
import { POSIX_PYTHON_MANIFEST } from "./desktop-installed-outlook-source-envelope-posix-python-manifest.mjs";
import { POSIX_PYTHON_OPS } from "./desktop-installed-outlook-source-envelope-posix-python-ops.mjs";
import { POSIX_PYTHON_TRANSACTIONS } from "./desktop-installed-outlook-source-envelope-posix-python-transactions.mjs";

export const POSIX_PYTHON_SCRIPT = POSIX_PYTHON_BASE
  + POSIX_PYTHON_MANIFEST
  + POSIX_PYTHON_OPS
  + POSIX_PYTHON_TRANSACTIONS
  + POSIX_PYTHON_ENTRY;
