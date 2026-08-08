import { execFileSync } from "node:child_process";

export function createCommandRunner({ cwd, allowedCommands, record = () => {}, execute = execFileSync } = {}) {
  const allowed = new Set(allowedCommands ?? []);
  return (command, args, options = {}) => {
    if (!allowed.has(command)) throw new Error(`unexpected command execution: ${command}`);
    record({ command, args: [...args] });
    return execute(command, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      ...options,
    });
  };
}

function output(runCommand, command, args) {
  return String(runCommand(command, args, { encoding: "utf8" })).trim();
}

export function exactGitIdentity({ expectedSourceSha, runCommand }) {
  const sourceSha = output(runCommand, "git", ["rev-parse", "HEAD"]);
  const sourceTree = output(runCommand, "git", ["rev-parse", "HEAD^{tree}"]);
  if (sourceSha !== expectedSourceSha) {
    throw new Error(`exact source SHA mismatch: expected ${expectedSourceSha}, got ${sourceSha}`);
  }
  const status = output(runCommand, "git", ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status) throw new Error("worktree changes make exact-SHA validation impossible");
  return { sourceSha, sourceTree };
}

export function trackedGitPaths(runCommand) {
  return new Set(String(runCommand("git", ["ls-files", "-z"], { encoding: "utf8" })).split("\0").filter(Boolean));
}

export function assertRecordedCommands(calls, allowedCommands) {
  const allowed = new Set(allowedCommands);
  const forbidden = calls.filter(({ command }) => !allowed.has(command));
  if (forbidden.length) throw new Error(`unexpected command execution: ${forbidden.map(({ command }) => command).join(", ")}`);
  return { call_count: calls.length, commands: [...new Set(calls.map(({ command }) => command))] };
}
