import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { gzipSync } from "node:zlib";
import { matterDesktopAuthenticodePowerShell } from "./matter-desktop-authenticode.mjs";

/**
 * The Windows native QA boundary is intentionally fail-closed.  A file is
 * opened by a long-lived PowerShell process with FileShare.Read, inspected,
 * and kept open until the process which was launched from that exact path has
 * exited.  This prevents a verify-by-path / CreateProcess-by-path gap.
 */
export const WINDOWS_LOCKED_EXECUTABLE_PROTOCOL = "lawos.windows-locked-executable.v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const DEFAULT_TIMEOUT_MS = 45_000;

export class WindowsLockedExecutableError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "WindowsLockedExecutableError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new WindowsLockedExecutableError(code, message, details);
}

function assertSafeString(value, name, { absolute = false } = {}) {
  if (typeof value !== "string" || value.length === 0 || /[\0\r\n]/u.test(value)) {
    fail("LOCKED_EXECUTABLE_INPUT", `${name} must be a non-empty string without controls`);
  }
  if (absolute && !/^(?:[A-Za-z]:[\\/]|\\\\)/u.test(value)) {
    fail("LOCKED_EXECUTABLE_PATH", `${name} must be an absolute Windows path`);
  }
  return value;
}

function validateInspection(inspection) {
  if (!inspection || typeof inspection !== "object"
    || inspection.protocol !== WINDOWS_LOCKED_EXECUTABLE_PROTOCOL
    || inspection.lock_mode !== "FileShare.Read"
    || inspection.denies_write_delete !== true
    || typeof inspection.path !== "string"
    || !inspection.path
    || !SHA256.test(inspection.sha256 ?? "")
    || !Number.isSafeInteger(inspection.bytes)
    || inspection.bytes < 1
    || typeof inspection.final_path !== "string"
    || !inspection.file_identity
    || typeof inspection.file_identity !== "object"
    || !Number.isFinite(Number(inspection.file_identity.volume_serial))
    || !Number.isFinite(Number(inspection.file_identity.file_id))
    || Number(inspection.file_identity.links) !== 1
    || !inspection.authenticode
    || typeof inspection.authenticode !== "object") {
    fail("LOCKED_EXECUTABLE_PROTOCOL", "PowerShell lock inspection was incomplete", { inspection });
  }
  return Object.freeze(inspection);
}

function validateProcessStatus(response, expectedPid, expectedPath) {
  const exited = response?.process_exited;
  if (!Number.isSafeInteger(response?.pid) || response.pid !== expectedPid
    || typeof response.active !== "boolean"
    || typeof exited !== "boolean"
    || response.active === exited
    || response.path_identity !== "pid_executable_path"
    || (response.active && (response.exit_code !== null
      || typeof response.image_path !== "string"
      || response.image_path.toLowerCase() !== expectedPath.toLowerCase()))
    || (exited && !Number.isInteger(response.exit_code))) {
    fail("LOCKED_EXECUTABLE_PROCESS_STATUS", "PowerShell process status proof was incomplete", { response });
  }
  return Object.freeze({
    pid: response.pid,
    active: response.active,
    process_exited: exited,
    exit_code: response.exit_code,
    path_identity: response.path_identity,
  });
}

function validateStoppedProcess(response, expectedPid) {
  if (!Number.isSafeInteger(response?.pid) || response.pid !== expectedPid
    || response.process_exited !== true
    || !Number.isInteger(response.exit_code)) {
    fail("LOCKED_EXECUTABLE_PROCESS_STOP", "PowerShell process stop proof was incomplete", { response });
  }
  return Object.freeze({ pid: response.pid, process_exited: true, exit_code: response.exit_code });
}

function validateAbort(response) {
  if (response?.released !== true || typeof response.child_present !== "boolean"
    || (response.child_present && (!Number.isSafeInteger(response.pid) || response.pid <= 0
      || response.process_exited !== true || !Number.isInteger(response.exit_code)))
    || (!response.child_present && (response.pid !== null
      || response.process_exited !== null || response.exit_code !== null))) {
    fail("LOCKED_EXECUTABLE_ABORT", "PowerShell abort proof was incomplete", { response });
  }
  return Object.freeze({
    child_present: response.child_present,
    pid: response.pid,
    process_exited: response.process_exited,
    exit_code: response.exit_code,
    released: true,
  });
}

function validateRelease(response) {
  if (response?.released !== true) {
    fail("LOCKED_EXECUTABLE_RELEASE", "PowerShell lock release proof was incomplete", { response });
  }
  return Object.freeze({ released: true });
}

export async function cleanupFailedWindowsElectronLaunch({ app, lockedSession, error }) {
  const cleanupErrors = [];
  try { await app.close(); } catch (closeError) { cleanupErrors.push(closeError); }
  try {
    if (!lockedSession.released) await lockedSession.abort();
  } catch (abortError) {
    cleanupErrors.push(abortError);
  }
  if (cleanupErrors.length > 0) {
    throw Object.assign(
      new AggregateError([error, ...cleanupErrors], "Electron launch and cleanup both failed"),
      { code: "WINDOWS_ELECTRON_LAUNCH_CLEANUP_FAILED" },
    );
  }
  throw error;
}

export async function settleWindowsLockedExecutableSession(session, pid) {
  if (!session || session.released) return null;
  const trackedPid = pid ?? session.child?.pid;
  let settlementError;
  try {
    if (trackedPid !== undefined) await session.waitForProcessExit(trackedPid);
    return await session.release();
  } catch (error) {
    settlementError = error;
  }
  if (session.released) throw settlementError;
  try {
    await session.abort();
  } catch (abortError) {
    throw Object.assign(
      new AggregateError([settlementError, abortError], "locked executable settlement and abort both failed"),
      { code: "WINDOWS_EXECUTABLE_LOCK_SETTLEMENT_FAILED" },
    );
  }
  throw settlementError;
}

function encodePowerShell(script) {
  const compressed = gzipSync(script, { level: 9 }).toString("base64");
  const bootstrap = String.raw`
$ErrorActionPreference = 'Stop'
$gzip = [IO.Compression.GZipStream]::new(
  [IO.MemoryStream]::new([Convert]::FromBase64String('${compressed}')),
  [IO.Compression.CompressionMode]::Decompress
)
$reader = [IO.StreamReader]::new($gzip, [Text.Encoding]::UTF8)
try {
  $source = $reader.ReadToEnd()
} finally {
  $reader.Dispose()
}
& ([ScriptBlock]::Create($source))
`;
  return Buffer.from(bootstrap, "utf16le").toString("base64");
}

function powershellScript() {
  // Reuse the existing Authenticode record schema.  The probe itself reads
  // $env:MATTER_AUTHENTICODE_PATH, which the helper sets only after the
  // FileStream is held open.
  const authProbe = Buffer.from(matterDesktopAuthenticodePowerShell(), "utf8").toString("base64");
  return String.raw`
$ErrorActionPreference = 'Stop'
$authProbe = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${authProbe}'))
if (-not ('LawOsLockedExecutableNative' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;

public static class LawOsLockedExecutableNative {
  private const uint GenericRead = 0x80000000;
  private const uint FileShareRead = 0x00000001;
  private const uint OpenExisting = 3;
  private const uint FileFlagOpenReparsePoint = 0x00200000;
  private const uint JobObjectExtendedLimitInformation = 9;
  private const uint KillOnJobClose = 0x00002000;

  [StructLayout(LayoutKind.Sequential)]
  private struct ByHandleFileInformation {
    public uint FileAttributes;
    public System.Runtime.InteropServices.ComTypes.FILETIME CreationTime;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastAccessTime;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWriteTime;
    public uint VolumeSerialNumber;
    public uint FileSizeHigh;
    public uint FileSizeLow;
    public uint NumberOfLinks;
    public uint FileIndexHigh;
    public uint FileIndexLow;
  }

  [StructLayout(LayoutKind.Sequential)]
  private struct JobObjectBasicLimitInformation {
    public long PerProcessUserTimeLimit;
    public long PerJobUserTimeLimit;
    public uint LimitFlags;
    public UIntPtr MinimumWorkingSetSize;
    public UIntPtr MaximumWorkingSetSize;
    public uint ActiveProcessLimit;
    public UIntPtr Affinity;
    public uint PriorityClass;
    public uint SchedulingClass;
  }

  [StructLayout(LayoutKind.Sequential)]
  private struct IoCounters {
    public ulong ReadOperationCount;
    public ulong WriteOperationCount;
    public ulong OtherOperationCount;
    public ulong ReadTransferCount;
    public ulong WriteTransferCount;
    public ulong OtherTransferCount;
  }

  [StructLayout(LayoutKind.Sequential)]
  private struct JobObjectExtendedLimitInformationStruct {
    public JobObjectBasicLimitInformation BasicLimitInformation;
    public IoCounters IoInfo;
    public UIntPtr ProcessMemoryLimit;
    public UIntPtr JobMemoryLimit;
    public UIntPtr PeakProcessMemoryUsed;
    public UIntPtr PeakJobMemoryUsed;
  }

  public sealed class HandleIdentity {
    public uint volume_serial { get; set; }
    public ulong file_id { get; set; }
    public uint links { get; set; }
    public uint attributes { get; set; }
    public bool reparse_point { get { return (attributes & 0x00000400) != 0; } }
    public bool directory { get { return (attributes & 0x00000010) != 0; } }
    public string final_path { get; set; }
  }

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  private static extern SafeFileHandle CreateFileW(
    string fileName, uint desiredAccess, uint shareMode, IntPtr securityAttributes,
    uint creationDisposition, uint flagsAndAttributes, IntPtr templateFile);

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool GetFileInformationByHandle(SafeFileHandle handle, out ByHandleFileInformation info);

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  private static extern uint GetFinalPathNameByHandleW(SafeFileHandle handle, StringBuilder path, uint length, uint flags);

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  private static extern bool QueryFullProcessImageNameW(IntPtr process, uint flags, StringBuilder path, ref uint length);

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  private static extern IntPtr CreateJobObjectW(IntPtr attributes, string name);

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool SetInformationJobObject(IntPtr job, uint infoClass, IntPtr info, uint length);

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool CloseHandle(IntPtr handle);

  private static void ThrowLastError(string action) {
    throw new Win32Exception(Marshal.GetLastWin32Error(), action);
  }

  public static SafeFileHandle OpenReadOnly(string path) {
    var handle = CreateFileW(path, GenericRead, FileShareRead, IntPtr.Zero, OpenExisting, FileFlagOpenReparsePoint, IntPtr.Zero);
    if (handle.IsInvalid) { ThrowLastError("CreateFileW failed for the exact executable path"); }
    return handle;
  }

  public static HandleIdentity ReadIdentity(SafeFileHandle handle) {
    if (!GetFileInformationByHandle(handle, out var info)) { ThrowLastError("GetFileInformationByHandle failed"); }
    var finalPathBuffer = new StringBuilder(32768);
    var finalLength = GetFinalPathNameByHandleW(handle, finalPathBuffer, (uint)finalPathBuffer.Capacity, 0);
    if (finalLength == 0 || finalLength >= finalPathBuffer.Capacity) { ThrowLastError("GetFinalPathNameByHandleW failed"); }
    return new HandleIdentity {
      volume_serial = info.VolumeSerialNumber,
      file_id = ((ulong)info.FileIndexHigh << 32) | info.FileIndexLow,
      links = info.NumberOfLinks,
      attributes = info.FileAttributes,
      final_path = finalPathBuffer.ToString(),
    };
  }

  public static HandleIdentity ReadPathIdentity(string path) {
    using (var handle = OpenReadOnly(path)) { return ReadIdentity(handle); }
  }

  public static string ReadProcessImagePath(IntPtr process) {
    var path = new StringBuilder(32768);
    var length = (uint)path.Capacity;
    if (!QueryFullProcessImageNameW(process, 0, path, ref length)) {
      ThrowLastError("QueryFullProcessImageNameW failed");
    }
    return path.ToString(0, (int)length);
  }

  public static IntPtr CreateKillOnCloseJob() {
    var job = CreateJobObjectW(IntPtr.Zero, null);
    if (job == IntPtr.Zero) { ThrowLastError("CreateJobObjectW failed"); }
    var size = Marshal.SizeOf<JobObjectExtendedLimitInformationStruct>();
    var infoPointer = Marshal.AllocHGlobal(size);
    try {
      var info = new JobObjectExtendedLimitInformationStruct();
      info.BasicLimitInformation.LimitFlags = KillOnJobClose;
      Marshal.StructureToPtr(info, infoPointer, false);
      if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, infoPointer, (uint)size)) {
        ThrowLastError("SetInformationJobObject failed");
      }
      return job;
    } catch {
      CloseHandle(job);
      throw;
    } finally { Marshal.FreeHGlobal(infoPointer); }
  }

  public static void AssignProcess(IntPtr job, Process process) {
    if (job == IntPtr.Zero || process == null || !AssignProcessToJobObject(job, process.Handle)) {
      ThrowLastError("AssignProcessToJobObject failed");
    }
  }

  public static void CloseJob(IntPtr job) {
    if (job != IntPtr.Zero && !CloseHandle(job)) { ThrowLastError("CloseHandle failed for the process job"); }
  }
}
'@
}
$state = [ordered]@{
  path = $null
  final_path = $null
  identity = $null
  stream = $null
  job = [IntPtr]::Zero
  child = $null
  child_started = $false
  released = $false
}
$requestId = $null

function Send-Response($value) {
  if ($value -isnot [Collections.IDictionary]) { throw 'locked executable response must be an IDictionary' }
  $response = [ordered]@{ id = $requestId }
  foreach ($entry in $value.GetEnumerator()) { $response[[string]$entry.Key] = $entry.Value }
  [Console]::Out.WriteLine(($response | ConvertTo-Json -Depth 30 -Compress))
  [Console]::Out.Flush()
}

function Send-Error($code, $message) {
  Send-Response([ordered]@{
    protocol = '${WINDOWS_LOCKED_EXECUTABLE_PROTOCOL}'
    ok = $false
    code = [string]$code
    error = [string]$message
  })
}

function Normalize-ExactPath($value) {
  if ([string]::IsNullOrWhiteSpace([string]$value) -or ([string]$value -match '[\0\r\n]')) {
    throw 'executable path is missing or contains a control character'
  }
  $full = [IO.Path]::GetFullPath([string]$value)
  return $full
}

function Assert-ValidIdentity($identity, $label) {
  if ($null -eq $identity -or $identity.directory -or $identity.reparse_point -or $identity.links -ne 1) {
    throw "$label is a directory, reparse point, or hard link"
  }
}

function Same-Identity($left, $right) {
  return $null -ne $left -and $null -ne $right
    -and [uint64]$left.volume_serial -eq [uint64]$right.volume_serial
    -and [uint64]$left.file_id -eq [uint64]$right.file_id
    -and [uint32]$left.links -eq [uint32]$right.links
    -and [uint32]$left.attributes -eq [uint32]$right.attributes
    -and [string]::Equals([string]$left.final_path, [string]$right.final_path, [StringComparison]::OrdinalIgnoreCase)
}

function Assert-PathMatchesHeldHandle {
  if ($null -eq $state.stream -or $state.released) { throw 'executable lock is not held' }
  $held = [LawOsLockedExecutableNative]::ReadIdentity($state.stream.SafeFileHandle)
  Assert-ValidIdentity $held 'held executable'
  if (-not (Same-Identity $held $state.identity)) { throw 'held executable identity changed unexpectedly' }
  $current = [LawOsLockedExecutableNative]::ReadPathIdentity($state.path)
  Assert-ValidIdentity $current 'executable path'
  if (-not (Same-Identity $current $state.identity)) {
    throw 'executable path no longer identifies the held file'
  }
  return $held
}

function Get-StreamDigest($stream) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    $stream.Position = 0
    $digest = ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '').ToLowerInvariant()
    $stream.Position = 0
    return $digest
  } finally { $sha.Dispose() }
}

function Get-ProcessImagePath($processId) {
  try {
    $record = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction Stop | Select-Object -First 1
    if ($null -ne $record -and -not [string]::IsNullOrWhiteSpace([string]$record.ExecutablePath)) {
      return [IO.Path]::GetFullPath([string]$record.ExecutablePath)
    }
  } catch {}
  try {
    $process = [Diagnostics.Process]::GetProcessById([int]$processId)
    try { return [IO.Path]::GetFullPath([string]$process.MainModule.FileName) } finally { $process.Dispose() }
  } catch { return $null }
}

function Assert-ProcessIdentity($processId) {
  $actual = Get-ProcessImagePath $processId
  if ([string]::IsNullOrWhiteSpace($actual)) {
    throw "process image path was not readable for PID $processId"
  }
  if (-not [String]::Equals($actual, $state.path, [StringComparison]::OrdinalIgnoreCase)) {
    throw "process image path did not match the locked executable: $actual"
  }
  return $actual
}

function Assert-RetainedProcessIdentity($process) {
  if ($null -eq $process -or $process.HasExited) {
    throw 'locked executable process exited before its retained identity could be verified'
  }
  $actual = [IO.Path]::GetFullPath([LawOsLockedExecutableNative]::ReadProcessImagePath($process.Handle))
  if (-not [String]::Equals($actual, $state.path, [StringComparison]::OrdinalIgnoreCase)) {
    throw "process image path did not match the locked executable: $actual"
  }
  if ($process.HasExited) {
    throw 'locked executable process exited while its retained identity was being verified'
  }
  return $actual
}

function Get-ChildStatus {
  if ($null -eq $state.child -or -not $state.child_started) { throw 'no started child process is tracked' }
  $childPid = [int]$state.child.Id
  if ($state.child.HasExited) {
    return [ordered]@{
      pid = $childPid
      active = $false
      process_exited = $true
      exit_code = [int]$state.child.ExitCode
      path_identity = 'pid_executable_path'
    }
  }
  $image = Assert-ProcessIdentity $childPid
  if ($state.child.HasExited) {
    return [ordered]@{
      pid = $childPid
      active = $false
      process_exited = $true
      exit_code = [int]$state.child.ExitCode
      path_identity = 'pid_executable_path'
    }
  }
  return [ordered]@{
    pid = $childPid
    active = $true
    process_exited = $false
    exit_code = $null
    image_path = $image
    path_identity = 'pid_executable_path'
  }
}

function Stop-ChildIfRunning {
  if ($null -eq $state.child -or -not $state.child_started) {
    return [ordered]@{ child_present = $false; pid = $null; process_exited = $null; exit_code = $null }
  }
  $childPid = [int]$state.child.Id
  if (-not $state.child.HasExited) {
    try { $state.child.Kill($true) } catch {
      if (-not $state.child.HasExited) { throw }
    }
  }
  if (-not $state.child.WaitForExit(5000) -or -not $state.child.HasExited) {
    throw "exact child process $childPid did not exit within the bounded stop interval"
  }
  return [ordered]@{
    child_present = $true
    pid = $childPid
    process_exited = $true
    exit_code = [int]$state.child.ExitCode
  }
}

function Release-Lock {
  if ($null -ne $state.job -and $state.job -ne [IntPtr]::Zero) {
    [LawOsLockedExecutableNative]::CloseJob($state.job)
    $state.job = [IntPtr]::Zero
  }
  if ($null -ne $state.stream) {
    $state.stream.Dispose()
    $state.stream = $null
  }
  if ($null -ne $state.child) {
    $state.child.Dispose()
    $state.child = $null
    $state.child_started = $false
  }
  $state.released = $true
}

function Invoke-Hold($request) {
  if ($null -ne $state.stream) { throw 'an executable is already held' }
  $state.path = Normalize-ExactPath $request.path
  $nativeHandle = [LawOsLockedExecutableNative]::OpenReadOnly($state.path)
  $state.identity = [LawOsLockedExecutableNative]::ReadIdentity($nativeHandle)
  Assert-ValidIdentity $state.identity 'executable'
  $state.final_path = [string]$state.identity.final_path
  $state.stream = [IO.FileStream]::new($nativeHandle, [IO.FileAccess]::Read, 1048576, $false)
  Assert-PathMatchesHeldHandle | Out-Null
  $env:MATTER_AUTHENTICODE_PATH = $state.path
  $sha256 = Get-StreamDigest $state.stream
  Assert-PathMatchesHeldHandle | Out-Null
  $authJson = & ([ScriptBlock]::Create($authProbe)) | Out-String
  $authenticode = $authJson.Trim() | ConvertFrom-Json -Depth 20
  Assert-PathMatchesHeldHandle | Out-Null
  Send-Response([ordered]@{
    protocol = '${WINDOWS_LOCKED_EXECUTABLE_PROTOCOL}'
    ok = $true
    operation = 'hold'
    path = $state.path
    final_path = $state.final_path
    file_identity = $state.identity
    sha256 = $sha256
    bytes = [int64]$state.stream.Length
    lock_mode = 'FileShare.Read'
    denies_write_delete = $true
    authenticode = $authenticode
  })
}

function Invoke-Launch($request) {
  if ($null -eq $state.stream -or $state.released) { throw 'executable lock is not held' }
  if ($null -ne $state.child -and -not $state.child.HasExited) { throw 'a child process is already tracked' }
  $cwd = if ($null -eq $request.cwd -or [string]::IsNullOrWhiteSpace([string]$request.cwd)) {
    [IO.Path]::GetDirectoryName($state.path)
  } else {
    $candidate = [IO.Path]::GetFullPath([string]$request.cwd)
    if (-not (Test-Path -LiteralPath $candidate -PathType Container)) { throw 'working directory does not exist' }
    $candidate
  }
  Assert-PathMatchesHeldHandle | Out-Null
  if ($state.job -eq [IntPtr]::Zero) { $state.job = [LawOsLockedExecutableNative]::CreateKillOnCloseJob() }
  $psi = [Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = $state.path
  $psi.WorkingDirectory = $cwd
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  if ($null -ne $request.args) {
    foreach ($argument in @($request.args)) {
      if ($null -eq $argument -or [string]$argument -match '[\0\r\n]') { throw 'process argument contains a control character' }
      [void]$psi.ArgumentList.Add([string]$argument)
    }
  }
  $state.child = [Diagnostics.Process]::new()
  $state.child.StartInfo = $psi
  try {
    if (-not $state.child.Start()) { throw 'CreateProcess failed for the locked executable' }
    $state.child_started = $true
    [LawOsLockedExecutableNative]::AssignProcess($state.job, $state.child)
    Assert-PathMatchesHeldHandle | Out-Null
    $childPid = $state.child.Id
    $image = $null
    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    while ([DateTime]::UtcNow -lt $deadline) {
      try { $image = Assert-ProcessIdentity $childPid; break } catch {
        if ($state.child.HasExited) { throw 'locked executable exited before its exact process identity could be verified' }
        Start-Sleep -Milliseconds 50
      }
    }
    if ([string]::IsNullOrWhiteSpace($image)) {
      throw 'locked executable process identity could not be proved'
    }
    Send-Response([ordered]@{
      protocol = '${WINDOWS_LOCKED_EXECUTABLE_PROTOCOL}'
      ok = $true
      operation = 'launch'
      pid = [int]$childPid
      image_path = $image
      path_identity = 'pid_executable_path'
    })
  } catch {
    $launchError = $_.Exception.Message
    try { Stop-ChildIfRunning | Out-Null } catch {
      throw "locked executable launch failed ($launchError) and exact child cleanup failed: $($_.Exception.Message)"
    }
    throw $launchError
  }
}

function Invoke-Adopt($request) {
  if ($null -eq $state.stream -or $state.released) { throw 'executable lock is not held' }
  if ($null -ne $state.child) { throw 'a child process is already tracked' }
  Assert-PathMatchesHeldHandle | Out-Null
  $requestedPid = [int]$request.pid
  if ($requestedPid -le 0) { throw 'a positive process PID is required' }
  $adoptedProcess = $null
  try {
    $adoptedProcess = [Diagnostics.Process]::GetProcessById($requestedPid)
    $image = Assert-RetainedProcessIdentity $adoptedProcess
    $state.child = $adoptedProcess
    $state.child_started = $true
    $adoptedProcess = $null
    if ($state.job -eq [IntPtr]::Zero) { $state.job = [LawOsLockedExecutableNative]::CreateKillOnCloseJob() }
    [LawOsLockedExecutableNative]::AssignProcess($state.job, $state.child)
    Assert-PathMatchesHeldHandle | Out-Null
    $image = Assert-RetainedProcessIdentity $state.child
    Send-Response([ordered]@{
      protocol = '${WINDOWS_LOCKED_EXECUTABLE_PROTOCOL}'
      ok = $true
      operation = 'adopt'
      pid = $requestedPid
      image_path = $image
      path_identity = 'pid_executable_path'
    })
  } catch {
    $adoptError = $_.Exception.Message
    if ($state.child_started) {
      try { Stop-ChildIfRunning | Out-Null } catch {
        throw "locked executable adoption failed ($adoptError) and exact child cleanup failed: $($_.Exception.Message)"
      }
    }
    throw $adoptError
  } finally {
    if ($null -ne $adoptedProcess) { $adoptedProcess.Dispose() }
  }
}

function Invoke-Wait($request) {
  if ($null -eq $state.child -or -not $state.child_started) { throw 'no started child process is tracked' }
  $requestedPid = [int]$request.pid
  if ($requestedPid -ne $state.child.Id) { throw 'wait PID does not match the tracked process' }
  $timeoutMs = [int]$request.timeout_ms
  if ($timeoutMs -lt 100 -or $timeoutMs -gt 600000) { throw 'wait timeout must be between 100ms and 10 minutes' }
  if (-not $state.child.HasExited -and -not $state.child.WaitForExit($timeoutMs)) {
    Stop-ChildIfRunning | Out-Null
    throw 'locked executable process exceeded its bounded wait timeout'
  }
  $status = Get-ChildStatus
  if ($status.process_exited -ne $true) { throw 'locked executable process exit was not observed' }
  Send-Response([ordered]@{
    protocol = '${WINDOWS_LOCKED_EXECUTABLE_PROTOCOL}'
    ok = $true
    operation = 'wait'
    pid = $requestedPid
    process_exited = $true
    exit_code = [int]$status.exit_code
  })
}

function Invoke-Status($request) {
  $status = Get-ChildStatus
  if ([int]$request.pid -ne [int]$status.pid) { throw 'status PID does not match the tracked process' }
  Send-Response([ordered]@{
    protocol = '${WINDOWS_LOCKED_EXECUTABLE_PROTOCOL}'
    ok = $true
    operation = 'status'
    pid = [int]$status.pid
    active = [bool]$status.active
    process_exited = [bool]$status.process_exited
    exit_code = $status.exit_code
    image_path = $status.image_path
    path_identity = $status.path_identity
  })
}

function Invoke-Stop($request) {
  if ($null -eq $state.child -or -not $state.child_started) { throw 'no started child process is tracked' }
  if ([int]$request.pid -ne [int]$state.child.Id) { throw 'stop PID does not match the tracked process' }
  $stopped = Stop-ChildIfRunning
  if ($stopped.child_present -ne $true -or $stopped.process_exited -ne $true) {
    throw 'exact child process stop was not observed'
  }
  Send-Response([ordered]@{
    protocol = '${WINDOWS_LOCKED_EXECUTABLE_PROTOCOL}'
    ok = $true
    operation = 'stop'
    pid = [int]$stopped.pid
    process_exited = $true
    exit_code = [int]$stopped.exit_code
  })
}

function Invoke-Abort {
  $stopped = Stop-ChildIfRunning
  Release-Lock
  Send-Response([ordered]@{
    protocol = '${WINDOWS_LOCKED_EXECUTABLE_PROTOCOL}'
    ok = $true
    operation = 'abort'
    child_present = [bool]$stopped.child_present
    pid = $stopped.pid
    process_exited = $stopped.process_exited
    exit_code = $stopped.exit_code
    released = $true
  })
}

function Invoke-Release {
  if ($null -ne $state.child -and $state.child_started) {
    $status = Get-ChildStatus
    if ($status.process_exited -ne $true) { throw 'cannot release executable lock while the child process is running' }
  }
  Release-Lock
  Send-Response([ordered]@{
    protocol = '${WINDOWS_LOCKED_EXECUTABLE_PROTOCOL}'
    ok = $true
    operation = 'release'
    released = $true
  })
}

try {
  while ($null -ne ($line = [Console]::In.ReadLine())) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    try {
      $request = $line | ConvertFrom-Json -Depth 20
      $requestId = [int]$request.id
      switch ([string]$request.operation) {
        'hold' { Invoke-Hold $request }
        'launch' { Invoke-Launch $request }
        'adopt' { Invoke-Adopt $request }
        'status' { Invoke-Status $request }
        'stop' { Invoke-Stop $request }
        'wait' { Invoke-Wait $request }
        'release' { Invoke-Release; exit 0 }
        'abort' { Invoke-Abort; exit 0 }
        default { throw 'unknown locked executable operation' }
      }
    } catch {
      Send-Error 'LOCKED_EXECUTABLE_OPERATION' $_.Exception.Message
    }
  }
} finally {
  Stop-ChildIfRunning | Out-Null
  Release-Lock
}
`;
}

function normalizeResponse(raw, expectedId) {
  if (!raw || typeof raw !== "object") {
    fail("LOCKED_EXECUTABLE_PROTOCOL", "PowerShell returned a non-object response");
  }
  if (raw.protocol !== WINDOWS_LOCKED_EXECUTABLE_PROTOCOL) {
    fail("LOCKED_EXECUTABLE_PROTOCOL", "PowerShell protocol version mismatch", { raw });
  }
  if (!Number.isSafeInteger(raw.id) || raw.id !== expectedId) {
    fail("LOCKED_EXECUTABLE_PROTOCOL", "PowerShell response id did not match the pending request", {
      expected_id: expectedId,
      actual_id: raw.id,
    });
  }
  if (raw.ok !== true) {
    throw new WindowsLockedExecutableError(
      raw.code ?? "LOCKED_EXECUTABLE_OPERATION",
      raw.error ?? "PowerShell locked executable operation failed",
      raw,
    );
  }
  return raw;
}

class JsonPowerShellTransport {
  constructor(child, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    this.child = child;
    this.timeoutMs = timeoutMs;
    this.closed = false;
    this.nextId = 1;
    this.pending = null;
    this.stderr = [];
    this.reader = createInterface({ input: child.stdout });
    child.stderr?.on("data", (chunk) => {
      this.stderr.push(String(chunk));
      if (this.stderr.join("").length > 8192) this.stderr = this.stderr.slice(-4);
    });
    child.once("error", (error) => this.rejectPending(new WindowsLockedExecutableError("LOCKED_EXECUTABLE_SPAWN", error.message)));
    child.once("close", (code, signal) => {
      this.closed = true;
      this.rejectPending(new WindowsLockedExecutableError(
        "LOCKED_EXECUTABLE_CLOSED",
        `PowerShell locked executable helper exited (${code ?? "null"}/${signal ?? "none"})`,
        { code, signal, stderr: this.stderr.join("") },
      ));
    });
    this.reader.on("line", (line) => {
      if (!this.pending) return;
      let parsed;
      try { parsed = JSON.parse(line); } catch (error) {
        this.rejectPending(new WindowsLockedExecutableError("LOCKED_EXECUTABLE_JSON", "PowerShell returned invalid JSON", { line, cause: error.message }));
        return;
      }
      const pending = this.pending;
      this.pending = null;
      clearTimeout(pending.timer);
      try { pending.resolve(normalizeResponse(parsed, pending.id)); } catch (error) {
        pending.reject(error);
        if (error?.code !== "LOCKED_EXECUTABLE_OPERATION") this.terminateHelper();
      }
    });
  }

  rejectPending(error) {
    if (!this.pending) return;
    const pending = this.pending;
    this.pending = null;
    clearTimeout(pending.timer);
    pending.reject(error);
  }

  terminateHelper() {
    if (this.closed) return;
    this.closed = true;
    try { this.child.kill(); } catch {}
  }

  request(operation, payload = {}) {
    if (this.closed || this.child.stdin.destroyed) {
      return Promise.reject(new WindowsLockedExecutableError("LOCKED_EXECUTABLE_CLOSED", "PowerShell locked executable helper is closed"));
    }
    if (this.pending) return Promise.reject(new WindowsLockedExecutableError("LOCKED_EXECUTABLE_PROTOCOL", "locked executable requests must be sequential"));
    const request = { protocol: WINDOWS_LOCKED_EXECUTABLE_PROTOCOL, id: this.nextId++, operation, ...payload };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending = null;
        this.terminateHelper();
        reject(new WindowsLockedExecutableError("LOCKED_EXECUTABLE_TIMEOUT", `locked executable operation timed out: ${operation}`));
      }, this.timeoutMs);
      this.pending = { resolve, reject, timer, id: request.id };
      this.child.stdin.write(`${JSON.stringify(request)}\n`);
    });
  }
}

export class WindowsLockedExecutableSession {
  constructor(transport, inspection) {
    this.transport = transport;
    this.inspection = validateInspection(inspection);
    this.path = this.inspection.path;
    this.child = null;
    this.released = false;
  }

  async launch(args = [], { cwd } = {}) {
    if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string" || /[\0\r\n]/u.test(arg))) {
      fail("LOCKED_EXECUTABLE_ARGUMENTS", "locked executable arguments must be literal strings without controls");
    }
    if (cwd !== undefined) assertSafeString(cwd, "cwd", { absolute: true });
    const response = await this.transport.request("launch", { args, cwd: cwd ?? null });
    if (!Number.isSafeInteger(response?.pid) || response.pid <= 0
      || response.path_identity !== "pid_executable_path"
      || typeof response.image_path !== "string"
      || response.image_path.toLowerCase() !== this.path.toLowerCase()) {
      fail("LOCKED_EXECUTABLE_LAUNCH", "PowerShell launch proof was incomplete", { response });
    }
    this.child = {
      pid: response.pid,
      image_path: response.image_path,
      path_identity: response.path_identity,
      operation: "launch",
    };
    return Object.freeze({ ...this.child });
  }

  async adoptProcess(pid) {
    if (!Number.isSafeInteger(pid) || pid <= 0) fail("LOCKED_EXECUTABLE_PID", "a positive process PID is required");
    const response = await this.transport.request("adopt", { pid });
    if (response?.pid !== pid || response.path_identity !== "pid_executable_path"
      || typeof response.image_path !== "string"
      || response.image_path.toLowerCase() !== this.path.toLowerCase()) {
      fail("LOCKED_EXECUTABLE_ADOPT", "PowerShell adopted-process proof was incomplete", { response });
    }
    this.child = {
      pid: response.pid,
      image_path: response.image_path,
      path_identity: response.path_identity,
      operation: "adopt",
    };
    return Object.freeze({ ...this.child });
  }

  async status(pid = this.child?.pid) {
    if (!Number.isSafeInteger(pid) || pid <= 0) fail("LOCKED_EXECUTABLE_PID", "a tracked process PID is required");
    return validateProcessStatus(
      await this.transport.request("status", { pid }),
      pid,
      this.path,
    );
  }

  async stop(pid = this.child?.pid) {
    if (!Number.isSafeInteger(pid) || pid <= 0) fail("LOCKED_EXECUTABLE_PID", "a tracked process PID is required");
    return validateStoppedProcess(await this.transport.request("stop", { pid }), pid);
  }

  async waitForProcessExit(pid = this.child?.pid) {
    if (!Number.isSafeInteger(pid) || pid <= 0) fail("LOCKED_EXECUTABLE_PID", "a tracked process PID is required");
    try {
      const timeoutMs = Math.max(100, this.transport.timeoutMs - 500);
      const response = await this.transport.request("wait", { pid, timeout_ms: timeoutMs });
      return validateStoppedProcess(response, pid);
    } catch (error) {
      try {
        await this.abort();
      } catch (abortError) {
        throw Object.assign(
          new AggregateError([error, abortError], "locked executable wait and abort both failed"),
          { code: "LOCKED_EXECUTABLE_WAIT_ABORT_FAILED" },
        );
      }
      throw error;
    }
  }

  async abort() {
    if (this.released) return this.abortEvidence;
    const evidence = validateAbort(await this.transport.request("abort"));
    this.released = true;
    this.abortEvidence = evidence;
    this.transport.child.stdin.end();
    return evidence;
  }

  async release() {
    if (this.released) return this.releaseEvidence ?? this.abortEvidence;
    const response = validateRelease(await this.transport.request("release"));
    this.released = true;
    this.releaseEvidence = response;
    this.transport.child.stdin.end();
    return response;
  }
}

export async function openWindowsLockedExecutable({
  executablePath,
  expectedSha256,
  platform = process.platform,
  powershellPath = "pwsh.exe",
  spawnPowerShell = spawn,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (platform !== "win32") {
    fail("LOCKED_EXECUTABLE_PLATFORM", "Windows locked executable verification requires a Windows host");
  }
  assertSafeString(executablePath, "executablePath", { absolute: true });
  if (expectedSha256 !== undefined && !SHA256.test(expectedSha256)) {
    fail("LOCKED_EXECUTABLE_HASH", "expectedSha256 must be a lowercase SHA-256 digest");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 600_000) {
    fail("LOCKED_EXECUTABLE_TIMEOUT", "timeoutMs must be between 1000ms and 10 minutes");
  }
  const child = spawnPowerShell(powershellPath, [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-EncodedCommand",
    encodePowerShell(powershellScript()),
  ], {
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const transport = new JsonPowerShellTransport(child, { timeoutMs });
  try {
    const inspection = await transport.request("hold", { path: executablePath });
    if (expectedSha256 !== undefined && inspection.sha256 !== expectedSha256) {
      throw new WindowsLockedExecutableError("LOCKED_EXECUTABLE_HASH", "locked executable SHA-256 did not match the expected digest", {
        expected_sha256: expectedSha256,
        actual_sha256: inspection.sha256,
      });
    }
    return new WindowsLockedExecutableSession(transport, inspection);
  } catch (error) {
    try { child.kill(); } catch {}
    throw error;
  }
}

export async function withWindowsLockedExecutable(options, callback) {
  if (typeof callback !== "function") throw new TypeError("locked executable callback is required");
  const session = await openWindowsLockedExecutable(options);
  try {
    const value = await callback(session);
    if (!session.released) await session.release();
    return value;
  } catch (error) {
    try {
      if (!session.released) await session.abort();
    } catch (abortError) {
      throw Object.assign(
        new AggregateError([error, abortError], "locked executable callback and abort both failed"),
        { code: "LOCKED_EXECUTABLE_CALLBACK_ABORT_FAILED" },
      );
    }
    throw error;
  }
}

export function windowsLockedExecutablePowerShellScriptForTest() {
  return powershellScript();
}
