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
  const regular = new Set();
  const entries = String(runCommand("git", ["ls-files", "-s", "-z"], { encoding: "utf8" }))
    .split("\0").filter(Boolean);
  for (const entry of entries) {
    const separator = entry.indexOf("\t");
    const metadata = separator > 0 ? entry.slice(0, separator).split(" ") : [];
    const trackedPath = separator > 0 ? entry.slice(separator + 1) : "";
    if (metadata.length !== 3
      || !/^[0-7]{6}$/u.test(metadata[0])
      || !/^[a-f0-9]{40,64}$/u.test(metadata[1])
      || metadata[2] !== "0"
      || trackedPath === "") {
      throw new Error("tracked Git index metadata is invalid or unmerged");
    }
    if (metadata[0] === "100644" || metadata[0] === "100755") regular.add(trackedPath);
  }
  return regular;
}

export function assertRecordedCommands(calls, allowedCommands) {
  const allowed = new Set(allowedCommands);
  const forbidden = calls.filter(({ command }) => !allowed.has(command));
  if (forbidden.length) throw new Error(`unexpected command execution: ${forbidden.map(({ command }) => command).join(", ")}`);
  return { call_count: calls.length, commands: [...new Set(calls.map(({ command }) => command))] };
}
