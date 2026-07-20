import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const PRIVATE_STAGING_GATE_ENVIRONMENT_KEYS = Object.freeze([
  "AWS_EC2_METADATA_DISABLED",
  "CI",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_NOSYSTEM",
  "HOME",
  "LANG",
  "LC_ALL",
  "NODE_ENV",
  "NO_COLOR",
  "NPM_CONFIG_AUDIT",
  "NPM_CONFIG_FUND",
  "NPM_CONFIG_OFFLINE",
  "NPM_CONFIG_UPDATE_NOTIFIER",
  "PATH",
  "TMPDIR",
]);

export const PRIVATE_STAGING_GATE_SANDBOX_PROFILE = [
  "(version 1)",
  "(allow default)",
  "(deny network-outbound)",
  "(allow network-outbound (remote ip \"localhost:*\"))",
  "(deny file-read* (subpath \"/Users\"))",
  "(deny file-write* (subpath \"/Users\"))",
  "(deny file-write* (subpath \"/Applications\"))",
  "(deny file-write* (subpath \"/Library\"))",
  "(deny file-write* (subpath \"/System\"))",
  "(deny file-write* (subpath \"/opt\"))",
  "(deny file-write* (subpath \"/usr\"))",
  "(deny file-write* (subpath \"/bin\"))",
  "(deny file-write* (subpath \"/sbin\"))",
].join(" ");

export function createPrivateStagingGateEnvironment(root) {
  const home = join(root, "home");
  const tmp = join(root, "tmp");
  const npmCache = join(root, "npm-cache");
  for (const path of [home, tmp, npmCache]) mkdirSync(path, { recursive: true, mode: 0o700 });
  const env = {
    AWS_EC2_METADATA_DISABLED: "true",
    CI: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    HOME: home,
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    NODE_ENV: "test",
    NO_COLOR: "1",
    NPM_CONFIG_AUDIT: "false",
    NPM_CONFIG_FUND: "false",
    NPM_CONFIG_OFFLINE: "true",
    NPM_CONFIG_UPDATE_NOTIFIER: "false",
    PATH: "/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
    TMPDIR: tmp,
  };
  const keys = Object.keys(env).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...PRIVATE_STAGING_GATE_ENVIRONMENT_KEYS].sort())) {
    throw new Error("private staging gate environment allowlist drifted");
  }
  return Object.freeze(env);
}

export function privateStagingGateCommand(command, args = []) {
  if (process.platform !== "darwin" || !existsSync("/usr/bin/sandbox-exec")) {
    throw new Error("private staging local gates require the macOS deny-egress sandbox");
  }
  return Object.freeze({
    command: "/usr/bin/sandbox-exec",
    args: Object.freeze(["-p", PRIVATE_STAGING_GATE_SANDBOX_PROFILE, command, ...args]),
  });
}
