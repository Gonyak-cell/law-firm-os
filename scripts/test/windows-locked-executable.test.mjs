import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";
import { gunzipSync } from "node:zlib";
import {
  WINDOWS_LOCKED_EXECUTABLE_PROTOCOL,
  WindowsLockedExecutableError,
  cleanupFailedWindowsElectronLaunch,
  openWindowsLockedExecutable,
  settleWindowsLockedExecutableSession,
  windowsLockedExecutablePowerShellScriptForTest,
} from "../lib/windows-locked-executable.mjs";
import { matterDesktopAuthenticodePowerShell } from "../lib/matter-desktop-authenticode.mjs";

const HASH = "a".repeat(64);

class FakePowerShell extends EventEmitter {
  constructor({ failLaunch = false, failAbort = false, projectDictionaryMetadata = false, responseDelayMs = {} } = {}) {
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
    this.projectDictionaryMetadata = projectDictionaryMetadata;
    this.responseDelayMs = responseDelayMs;
    this.responses = [];
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
            ? {
              ...base,
              operation: "launch",
              pid: 101,
              image_path: "C:\\runner\\matter.exe",
              path_identity: "pid_executable_path",
              process_tree_policy: request.process_tree_policy,
            }
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
        if (this.projectDictionaryMetadata) {
          const { id, ...entries } = response;
          response = {
            id,
            Count: Object.keys(entries).length,
            Keys: Object.keys(entries),
            Values: Object.values(entries),
          };
        }
        this.responses.push(response);
        setTimeout(() => {
          this.stdout.write(`${JSON.stringify(response)}\n`);
          if (["release", "abort"].includes(request.operation) && response.ok === true) {
            this.stdout.end();
            this.emit("close", 0, null);
          }
        }, this.responseDelayMs[request.operation] ?? 0);
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
    "QueryFullProcessImageNameW",
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
    "verified-bootstrap",
    "WaitForSingleObject",
    "WaitForJobExit",
    "Wait-ForProcessJobToDrain",
    "authProbe",
    "FromBase64String",
    "ScriptBlock]::Create($authProbe)",
    "authenticode = $authenticode",
    "[Diagnostics.ProcessStartInfo]::new()",
    "ArgumentList.Add",
    "Get-CimInstance Win32_Process",
    "Assert-ProcessIdentity",
    "Assert-RetainedProcessIdentity",
    "Get-ChildStatus",
    "WaitForExit",
    "Invoke-Status",
    "Invoke-Stop",
    "Invoke-Abort",
    "[Collections.IDictionary]",
    "$value.GetEnumerator()",
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
  assert.match(script, /\$value -isnot \[Collections\.IDictionary\]/u);
  assert.match(script, /foreach \(\$entry in \$value\.GetEnumerator\(\)\) \{ \$response\[\[string\]\$entry\.Key\] = \$entry\.Value \}/u);
  assert.doesNotMatch(script, /\$value\.PSObject\.Properties/u);
  assert.match(script, /\$state\.child\.Kill\(\$true\)/u);
  assert.match(script, /\$state\.child\.WaitForExit\(5000\)/u);
  assert.match(script, /ReadProcessImagePath\(\$process\.Handle\)/u);
  assert.match(script, /function Assert-LaunchedProcessIdentity\(\$process\)/u);
  const launchBody = script.slice(script.indexOf("function Invoke-Launch"), script.indexOf("function Invoke-Adopt"));
  assert.match(launchBody, /\$image = Assert-LaunchedProcessIdentity \$state\.child/u);
  assert.doesNotMatch(launchBody, /Assert-ProcessIdentity \$childPid|Get-CimInstance|Start-Sleep/u);
  assert.match(script, /\$image = Assert-RetainedProcessIdentity \$adoptedProcess/u);
  assert.match(script, /\[LawOsLockedExecutableNative\]::AssignProcess\(\$state\.job, \$state\.child\)/u);
  assert.match(script, /if \(\$processTreePolicy -eq 'contained'\)/u);
  assert.match(script, /\$image = Assert-RetainedProcessIdentity \$state\.child/u);
  assert.match(script, /locked executable adoption failed \(\$adoptError\) and exact child cleanup failed/u);
  assert.doesNotMatch(script, /Invoke-Adopt[\s\S]*?Assert-ProcessIdentity \$requestedPid/u);
  assert.match(script, /locked executable launch failed \(\$launchError\) and exact child cleanup failed/u);
  assert.match(script, /CloseHandle failed for the process job/u);
  assert.match(script, /WaitForSingleObject failed for the process job/u);
  const stopBody = script.slice(script.indexOf("function Stop-ChildIfRunning"), script.indexOf("function Release-Lock"));
  assert.doesNotMatch(stopBody, /catch\s*\{\s*\}/u);
  const releaseBody = script.slice(script.indexOf("function Release-Lock"), script.indexOf("function Invoke-Hold"));
  assert.ok(
    releaseBody.indexOf("$state.stream.Dispose()") < releaseBody.indexOf("Wait-ForProcessJobToDrain"),
    "the verified path lock must be released before waiting for inherited bootstrap cleanup",
  );
  assert.match(releaseBody, /\$drainError = \$null[\s\S]*Wait-ForProcessJobToDrain[\s\S]*throw \$drainError/u);
  const finalizer = script.slice(script.lastIndexOf("} finally {"));
  assert.doesNotMatch(finalizer, /try\s*\{\s*Stop-ChildIfRunning|try\s*\{\s*Release-Lock/u);
  assert.doesNotMatch(script, /\$pid\b/u, "PowerShell's read-only automatic $PID variable must not be shadowed");
});

test("compressed PowerShell bootstrap reconstructs the exact helper below the Windows command limit", async () => {
  const child = new FakePowerShell();
  let spawnCall;
  const session = await openWindowsLockedExecutable({
    executablePath: "C:\\runner\\matter.exe",
    expectedSha256: HASH,
    platform: "win32",
    spawnPowerShell(command, args, options) {
      spawnCall = { command, args, options };
      return child;
    },
    timeoutMs: 2_000,
  });
  assert.equal(spawnCall.command, "pwsh.exe");
  assert.equal(spawnCall.args.at(-2), "-EncodedCommand");
  const bootstrap = Buffer.from(spawnCall.args.at(-1), "base64").toString("utf16le");
  const payload = bootstrap.match(/FromBase64String\('([A-Za-z0-9+/=]+)'\)/u)?.[1];
  assert.equal(typeof payload, "string");
  assert.equal(
    gunzipSync(Buffer.from(payload, "base64")).toString("utf8"),
    windowsLockedExecutablePowerShellScriptForTest(),
  );
  assert.match(bootstrap, /\[IO\.Compression\.GZipStream\]::new/u);
  assert.match(bootstrap, /\[ScriptBlock\]::Create\(\$source\)/u);
  assert.equal(
    [spawnCall.command, ...spawnCall.args].reduce((length, arg) => length + arg.length + 3, 0) < 32_767,
    true,
  );
  assert.deepEqual(spawnCall.options.stdio, ["pipe", "pipe", "pipe"]);
  await session.release();
});

test("release response timeout includes bounded process-tree drain headroom", async () => {
  const child = new FakePowerShell({ responseDelayMs: { release: 1_100 } });
  const session = await openWindowsLockedExecutable({
    executablePath: "C:\\runner\\matter.exe",
    expectedSha256: HASH,
    platform: "win32",
    spawnPowerShell: () => child,
    timeoutMs: 1_000,
  });
  assert.deepEqual(await session.release(), { released: true });
  assert.equal(session.released, true);
});

test("dictionary metadata projection cannot satisfy the closed helper protocol", async () => {
  const child = new FakePowerShell({ projectDictionaryMetadata: true });
  await assert.rejects(
    openWindowsLockedExecutable({
      executablePath: "C:\\runner\\matter.exe",
      expectedSha256: HASH,
      platform: "win32",
      spawnPowerShell: () => child,
      timeoutMs: 2_000,
    }),
    (error) => error instanceof WindowsLockedExecutableError && error.code === "LOCKED_EXECUTABLE_PROTOCOL",
  );
  assert.deepEqual(Object.keys(child.responses[0]), ["id", "Count", "Keys", "Values"]);
  assert.deepEqual(child.responses[0].Keys, [
    "protocol",
    "ok",
    "operation",
    "path",
    "final_path",
    "file_identity",
    "sha256",
    "bytes",
    "lock_mode",
    "denies_write_delete",
    "authenticode",
  ]);
  assert.equal(child.killed, true);
});

test("failed Electron launch cleanup attempts close and abort and aggregates every failure", async () => {
  const primaryError = new Error("post-adoption page discovery failed");
  const closeError = new Error("Electron close failed");
  const abortError = new Error("locked-session abort failed");
  const calls = [];
  await assert.rejects(
    cleanupFailedWindowsElectronLaunch({
      app: {
        async close() {
          calls.push("close");
          throw closeError;
        },
      },
      lockedSession: {
        released: false,
        child: { pid: 707 },
        async abort() {
          calls.push("abort");
          throw abortError;
        },
      },
      error: primaryError,
    }),
    (error) => {
      assert.equal(error instanceof AggregateError, true);
      assert.equal(error.code, "WINDOWS_ELECTRON_LAUNCH_CLEANUP_FAILED");
      assert.deepEqual(error.errors, [primaryError, closeError, abortError]);
      return true;
    },
  );
  assert.deepEqual(calls, ["close", "abort"]);
});

test("locked-session settlement falls back to the tracked child PID", async () => {
  const calls = [];
  const session = {
    released: false,
    child: { pid: 808 },
    async waitForProcessExit(pid) { calls.push(["wait", pid]); },
    async release() {
      calls.push(["release"]);
      this.released = true;
      return { released: true };
    },
    async abort() { calls.push(["abort"]); },
  };
  assert.deepEqual(await settleWindowsLockedExecutableSession(session), { released: true });
  assert.deepEqual(calls, [["wait", 808], ["release"]]);
});

test("locked-session settlement propagates wait, release, and abort failures", async () => {
  const waitError = new Error("wait failed");
  const waitCalls = [];
  const waitSession = {
    released: false,
    child: { pid: 909 },
    async waitForProcessExit(pid) {
      waitCalls.push(["wait", pid]);
      throw waitError;
    },
    async release() { waitCalls.push(["release"]); },
    async abort() {
      waitCalls.push(["abort"]);
      this.released = true;
      return { released: true };
    },
  };
  await assert.rejects(settleWindowsLockedExecutableSession(waitSession), (error) => error === waitError);
  assert.deepEqual(waitCalls, [["wait", 909], ["abort"]]);

  const releaseError = new Error("release failed");
  const abortError = new Error("abort failed");
  const releaseCalls = [];
  const releaseSession = {
    released: false,
    child: { pid: 1001 },
    async waitForProcessExit(pid) { releaseCalls.push(["wait", pid]); },
    async release() {
      releaseCalls.push(["release"]);
      throw releaseError;
    },
    async abort() {
      releaseCalls.push(["abort"]);
      throw abortError;
    },
  };
  await assert.rejects(
    settleWindowsLockedExecutableSession(releaseSession),
    (error) => {
      assert.equal(error instanceof AggregateError, true);
      assert.equal(error.code, "WINDOWS_EXECUTABLE_LOCK_SETTLEMENT_FAILED");
      assert.deepEqual(error.errors, [releaseError, abortError]);
      return true;
    },
  );
  assert.deepEqual(releaseCalls, [["wait", 1001], ["release"], ["abort"]]);
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
    process_tree_policy: "contained",
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
  assert.equal(child.requests[1].process_tree_policy, "contained");
});

test("verified NSIS install or uninstall bootstrap may finish cleanup outside the kill-on-close job", async () => {
  const child = new FakePowerShell();
  const session = await openWindowsLockedExecutable({
    executablePath: "C:\\runner\\matter.exe",
    expectedSha256: HASH,
    platform: "win32",
    spawnPowerShell: () => child,
    timeoutMs: 2_000,
  });
  const launch = await session.launch(["/S"], {
    cwd: "C:\\runner",
    processTreePolicy: "verified-bootstrap",
  });
  assert.equal(launch.process_tree_policy, "verified-bootstrap");
  assert.equal(child.requests[1].process_tree_policy, "verified-bootstrap");
  await session.waitForProcessExit(launch.pid);
  await session.release();
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
