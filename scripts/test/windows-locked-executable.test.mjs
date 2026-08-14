import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";
import {
  WINDOWS_LOCKED_EXECUTABLE_PROTOCOL,
  WindowsLockedExecutableError,
  openWindowsLockedExecutable,
  windowsLockedExecutablePowerShellScriptForTest,
} from "../lib/windows-locked-executable.mjs";
import { matterDesktopAuthenticodePowerShell } from "../lib/matter-desktop-authenticode.mjs";

const HASH = "a".repeat(64);

class FakePowerShell extends EventEmitter {
  constructor({ failLaunch = false, failAbort = false } = {}) {
    super();
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
    this.stdin = new PassThrough();
    this.requests = [];
    this.killed = false;
    this.active = false;
    this.childPresent = false;
    this.exitCode = null;
    this.failLaunch = failLaunch;
    this.failAbort = failAbort;
    this.stdin.on("data", (chunk) => {
      for (const line of String(chunk).split(/\r?\n/u).filter(Boolean)) {
        const request = JSON.parse(line);
        this.requests.push(request);
        const base = { id: request.id, protocol: WINDOWS_LOCKED_EXECUTABLE_PROTOCOL, ok: true };
        let response = request.operation === "hold"
          ? {
            ...base,
            operation: "hold",
            path: "C:\\runner\\matter.exe",
            final_path: "\\\\?\\C:\\runner\\matter.exe",
            file_identity: { volume_serial: 7, file_id: 11, links: 1, attributes: 32 },
            sha256: HASH,
            bytes: 123,
            lock_mode: "FileShare.Read",
            denies_write_delete: true,
            authenticode: { status: "Valid" },
          }
          : request.operation === "launch"
            ? { ...base, operation: "launch", pid: 101, image_path: "C:\\runner\\matter.exe", path_identity: "pid_executable_path" }
            : request.operation === "adopt"
              ? { ...base, operation: "adopt", pid: request.pid, image_path: "C:\\runner\\matter.exe", path_identity: "pid_executable_path" }
              : request.operation === "status"
                ? {
                  ...base,
                  operation: "status",
                  pid: request.pid,
                  active: this.active,
                  process_exited: !this.active,
                  exit_code: this.active ? null : this.exitCode,
                  image_path: this.active ? "C:\\runner\\matter.exe" : null,
                  path_identity: "pid_executable_path",
                }
                : request.operation === "stop"
                  ? { ...base, operation: "stop", pid: request.pid, process_exited: true, exit_code: 1 }
              : request.operation === "wait"
                ? { ...base, operation: "wait", pid: request.pid, process_exited: true, exit_code: 0 }
                : request.operation === "abort"
                  ? {
                    ...base,
                    operation: "abort",
                    child_present: this.childPresent,
                    pid: this.childPresent ? 101 : null,
                    process_exited: this.childPresent ? true : null,
                    exit_code: this.childPresent ? 1 : null,
                    released: true,
                  }
                  : { ...base, operation: "release", released: true };
        if (request.operation === "launch") {
          this.childPresent = true;
          this.active = true;
          if (this.failLaunch) response = {
            ...base,
            ok: false,
            code: "LOCKED_EXECUTABLE_OPERATION",
            error: "injected AssignProcessToJobObject failure after exact child cleanup",
          };
        }
        if (request.operation === "adopt") {
          this.childPresent = true;
          this.active = true;
        }
        if (["stop", "wait", "abort"].includes(request.operation)) {
          this.active = false;
          this.exitCode = request.operation === "wait" ? 0 : 1;
        }
        if (request.operation === "abort" && this.failAbort) response = {
          ...base,
          ok: false,
          code: "LOCKED_EXECUTABLE_OPERATION",
          error: "injected exact child abort failure",
        };
        setImmediate(() => {
          this.stdout.write(`${JSON.stringify(response)}\n`);
          if (["release", "abort"].includes(request.operation) && response.ok === true) {
            this.stdout.end();
            this.emit("close", 0, null);
          }
        });
      }
    });
  }

  kill() {
    this.killed = true;
    this.emit("close", null, "SIGTERM");
  }
}

test("PowerShell helper is a long-lived exact-path read lock and identity gate", () => {
  const script = windowsLockedExecutablePowerShellScriptForTest();
  for (const fragment of [
    "[IO.FileAccess]::Read",
    "FileShareRead",
    "CreateFileW",
    "FileFlagOpenReparsePoint",
    "GetFileInformationByHandle",
    "GetFinalPathNameByHandleW",
    "FileIndexHigh",
    "FileIndexLow",
    "file_id",
    "final_path",
    "NumberOfLinks",
    "links",
    "reparse_point",
    "denies_write_delete",
    "CreateJobObjectW",
    "KillOnClose",
    "AssignProcessToJobObject",
    "authProbe",
    "FromBase64String",
    "ScriptBlock]::Create($authProbe)",
    "authenticode = $authenticode",
    "[Diagnostics.ProcessStartInfo]::new()",
    "ArgumentList.Add",
    "Get-CimInstance Win32_Process",
    "Assert-ProcessIdentity",
    "Get-ChildStatus",
    "WaitForExit",
    "Invoke-Status",
    "Invoke-Stop",
    "Invoke-Abort",
    "timeout_ms",
    "cannot release executable lock while the child process is running",
    WINDOWS_LOCKED_EXECUTABLE_PROTOCOL,
  ]) assert.equal(script.includes(fragment), true, `missing helper contract: ${fragment}`);
  const encodedAuthenticodeProbe = Buffer.from(matterDesktopAuthenticodePowerShell(), "utf8").toString("base64");
  assert.equal(script.includes(encodedAuthenticodeProbe), true, "helper must embed the shared Authenticode probe as encoded source");
  assert.match(script, /\$authProbe = \[Text\.Encoding\]::UTF8\.GetString\(\[Convert\]::FromBase64String/u);
  assert.match(script, /\$authenticode = \$authJson\.Trim\(\) \| ConvertFrom-Json/u);
  assert.match(script, /FileShareRead = 0x00000001/u);
  assert.match(script, /FileFlagOpenReparsePoint = 0x00200000/u);
  assert.match(script, /CreateFileW\(path, GenericRead, FileShareRead, IntPtr\.Zero, OpenExisting, FileFlagOpenReparsePoint/u);
  assert.match(script, /\$state\.stream = \[IO\.FileStream\]::new/u);
  assert.match(script, /\$psi\.FileName = \$state\.path/u);
  assert.match(script, /path_identity = 'pid_executable_path'/u);
  assert.match(script, /file_identity = \$state\.identity/u);
  assert.match(script, /Assert-PathMatchesHeldHandle \| Out-Null/u);
  assert.match(script, /response = \[ordered\]@\{ id = \$requestId \}/u);
  assert.match(script, /\$state\.child\.Kill\(\$true\)/u);
  assert.match(script, /\$state\.child\.WaitForExit\(5000\)/u);
  assert.match(script, /locked executable launch failed \(\$launchError\) and exact child cleanup failed/u);
  assert.match(script, /CloseHandle failed for the process job/u);
  const stopBody = script.slice(script.indexOf("function Stop-ChildIfRunning"), script.indexOf("function Release-Lock"));
  assert.doesNotMatch(stopBody, /catch\s*\{\s*\}/u);
  const finalizer = script.slice(script.lastIndexOf("} finally {"));
  assert.doesNotMatch(finalizer, /try\s*\{\s*Stop-ChildIfRunning|try\s*\{\s*Release-Lock/u);
  assert.doesNotMatch(script, /\$pid\b/u, "PowerShell's read-only automatic $PID variable must not be shadowed");
});

test("Windows locked executable session keeps the stream across launch, adopt, wait, and release", async () => {
  const child = new FakePowerShell();
  const session = await openWindowsLockedExecutable({
    executablePath: "C:\\runner\\matter.exe",
    expectedSha256: HASH,
    platform: "win32",
    spawnPowerShell: () => child,
    timeoutMs: 2_000,
  });
  assert.equal(session.path, "C:\\runner\\matter.exe");
  assert.equal(session.inspection.lock_mode, "FileShare.Read");
  assert.deepEqual(session.inspection.authenticode, { status: "Valid" });
  const launch = await session.launch(["--disable-gpu"], { cwd: "C:\\runner" });
  assert.deepEqual(launch, {
    pid: 101,
    image_path: "C:\\runner\\matter.exe",
    path_identity: "pid_executable_path",
    operation: "launch",
  });
  const adopted = await session.adoptProcess(101);
  assert.equal(adopted.path_identity, "pid_executable_path");
  assert.deepEqual(await session.status(101), {
    pid: 101,
    active: true,
    process_exited: false,
    exit_code: null,
    path_identity: "pid_executable_path",
  });
  assert.deepEqual(await session.waitForProcessExit(101), { pid: 101, process_exited: true, exit_code: 0 });
  assert.deepEqual(await session.status(101), {
    pid: 101,
    active: false,
    process_exited: true,
    exit_code: 0,
    path_identity: "pid_executable_path",
  });
  await session.release();
  assert.equal(session.released, true);
  assert.deepEqual(child.requests.map(({ operation }) => operation), [
    "hold", "launch", "adopt", "status", "wait", "status", "release",
  ]);
  assert.deepEqual(child.requests[1].args, ["--disable-gpu"]);
  assert.equal(child.requests[1].cwd, "C:\\runner");
});

test("native Process-object status and stop prove exact child exit before release", async () => {
  const child = new FakePowerShell();
  const session = await openWindowsLockedExecutable({
    executablePath: "C:\\runner\\matter.exe",
    expectedSha256: HASH,
    platform: "win32",
    spawnPowerShell: () => child,
    timeoutMs: 2_000,
  });
  await session.launch([], { cwd: "C:\\runner" });
  assert.equal((await session.status(101)).active, true);
  assert.deepEqual(await session.stop(101), { pid: 101, process_exited: true, exit_code: 1 });
  assert.equal((await session.status(101)).process_exited, true);
  assert.deepEqual(await session.release(), { released: true });
  assert.deepEqual(child.requests.map(({ operation }) => operation), ["hold", "launch", "status", "stop", "status", "release"]);
});

test("launch operation failure retains the helper until exact abort proof", async () => {
  const child = new FakePowerShell({ failLaunch: true });
  const session = await openWindowsLockedExecutable({
    executablePath: "C:\\runner\\matter.exe",
    expectedSha256: HASH,
    platform: "win32",
    spawnPowerShell: () => child,
    timeoutMs: 2_000,
  });
  await assert.rejects(() => session.launch([], { cwd: "C:\\runner" }), /AssignProcessToJobObject failure/u);
  assert.equal(child.killed, false, "normal operation errors must retain the helper for native abort");
  assert.deepEqual(await session.abort(), {
    child_present: true,
    pid: 101,
    process_exited: true,
    exit_code: 1,
    released: true,
  });
  assert.equal(session.released, true);
  assert.deepEqual(child.requests.map(({ operation }) => operation), ["hold", "launch", "abort"]);
});

test("abort failure propagates without fabricating released state", async () => {
  const child = new FakePowerShell({ failLaunch: true, failAbort: true });
  const session = await openWindowsLockedExecutable({
    executablePath: "C:\\runner\\matter.exe",
    expectedSha256: HASH,
    platform: "win32",
    spawnPowerShell: () => child,
    timeoutMs: 2_000,
  });
  await assert.rejects(() => session.launch([], { cwd: "C:\\runner" }), /AssignProcessToJobObject failure/u);
  await assert.rejects(() => session.abort(), /exact child abort failure/u);
  assert.equal(session.released, false);
  assert.equal(child.killed, false);
  child.kill();
});

test("locked executable helper fails closed off Windows and on hash drift", async () => {
  await assert.rejects(
    openWindowsLockedExecutable({ executablePath: "C:\\runner\\matter.exe", platform: "darwin" }),
    (error) => error instanceof WindowsLockedExecutableError && error.code === "LOCKED_EXECUTABLE_PLATFORM",
  );
  const child = new FakePowerShell();
  await assert.rejects(
    openWindowsLockedExecutable({
      executablePath: "C:\\runner\\matter.exe",
      expectedSha256: "b".repeat(64),
      platform: "win32",
      spawnPowerShell: () => child,
      timeoutMs: 2_000,
    }),
    (error) => error instanceof WindowsLockedExecutableError && error.code === "LOCKED_EXECUTABLE_HASH",
  );
  assert.equal(child.killed, true);
});
