$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $IsWindows) {
  throw 'native installed-tree snapshot requires Windows'
}
if ($PSVersionTable.PSVersion -lt [Version]'7.2') {
  throw 'native installed-tree snapshot requires PowerShell 7.2+'
}
$rootPath = [string]$env:MATTER_INSTALLED_TREE_ROOT
if ([string]::IsNullOrWhiteSpace($rootPath) -or $rootPath.IndexOf([char]0) -ge 0) {
  throw 'MATTER_INSTALLED_TREE_ROOT must be a non-empty path'
}

$nativeSource = @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32.SafeHandles;

namespace LawFirmOs.WindowsInstalledTree
{
    public sealed class PortableFile
    {
        public string Path { get; set; }
        public long Bytes { get; set; }
        public string Sha256 { get; set; }
    }

    public sealed class SnapshotPhase
    {
        public string Name { get; set; }
        public string ContentSha256 { get; set; }
        public string IdentitySha256 { get; set; }
        public int FileCount { get; set; }
        public int DirectoryCount { get; set; }
        public long Bytes { get; set; }
    }

    public sealed class StableSnapshot
    {
        public string FileSystem { get; set; }
        public string ContentSha256 { get; set; }
        public string IdentitySha256 { get; set; }
        public int FileCount { get; set; }
        public int DirectoryCount { get; set; }
        public long Bytes { get; set; }
        public PortableFile[] Files { get; set; }
        public SnapshotPhase[] Phases { get; set; }
    }

    internal sealed class NativeMetadata
    {
        internal ulong VolumeSerial;
        internal string FileId;
        internal long CreationTime;
        internal long LastWriteTime;
        internal long ChangeTime;
        internal uint Attributes;
        internal uint ReparseTag;
        internal long AllocationSize;
        internal long EndOfFile;
        internal uint NumberOfLinks;
        internal bool DeletePending;
        internal bool IsDirectory;
        internal string StreamSignature;

        internal bool EqualsExact(NativeMetadata other)
        {
            return other != null
                && VolumeSerial == other.VolumeSerial
                && String.Equals(FileId, other.FileId, StringComparison.Ordinal)
                && CreationTime == other.CreationTime
                && LastWriteTime == other.LastWriteTime
                && ChangeTime == other.ChangeTime
                && Attributes == other.Attributes
                && ReparseTag == other.ReparseTag
                && AllocationSize == other.AllocationSize
                && EndOfFile == other.EndOfFile
                && NumberOfLinks == other.NumberOfLinks
                && DeletePending == other.DeletePending
                && IsDirectory == other.IsDirectory
                && String.Equals(StreamSignature, other.StreamSignature, StringComparison.Ordinal);
        }
    }

    internal sealed class SingleSnapshot
    {
        internal string FileSystem;
        internal string ContentManifest;
        internal string IdentityManifest;
        internal string ContentSha256;
        internal string IdentitySha256;
        internal List<PortableFile> Files;
        internal int DirectoryCount;
        internal long Bytes;
    }

    public static class NativeInstalledTreeSnapshot
    {
        private const uint FILE_READ_DATA = 0x00000001;
        private const uint FILE_READ_ATTRIBUTES = 0x00000080;
        private const uint FILE_SHARE_READ = 0x00000001;
        private const uint OPEN_EXISTING = 3;
        private const uint FILE_FLAG_BACKUP_SEMANTICS = 0x02000000;
        private const uint FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000;
        private const uint FILE_FLAG_SEQUENTIAL_SCAN = 0x08000000;
        private const uint FILE_ATTRIBUTE_DIRECTORY = 0x00000010;
        private const uint FILE_ATTRIBUTE_DEVICE = 0x00000040;
        private const uint FILE_ATTRIBUTE_REPARSE_POINT = 0x00000400;
        private const int ERROR_HANDLE_EOF = 38;
        private const int ERROR_INSUFFICIENT_BUFFER = 122;
        private const int ERROR_MORE_DATA = 234;
        private const int MAX_STREAM_INFO_BYTES = 16 * 1024 * 1024;
        private const int HASH_BUFFER_BYTES = 1024 * 1024;

        private enum FILE_INFO_BY_HANDLE_CLASS
        {
            FileBasicInfo = 0,
            FileStandardInfo = 1,
            FileStreamInfo = 7,
            FileAttributeTagInfo = 9,
            FileIdInfo = 18
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct FILE_BASIC_INFO
        {
            internal long CreationTime;
            internal long LastAccessTime;
            internal long LastWriteTime;
            internal long ChangeTime;
            internal uint FileAttributes;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct FILE_STANDARD_INFO
        {
            internal long AllocationSize;
            internal long EndOfFile;
            internal uint NumberOfLinks;
            [MarshalAs(UnmanagedType.U1)] internal bool DeletePending;
            [MarshalAs(UnmanagedType.U1)] internal bool Directory;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct FILE_ATTRIBUTE_TAG_INFO
        {
            internal uint FileAttributes;
            internal uint ReparseTag;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct FILE_ID_INFO
        {
            internal ulong VolumeSerialNumber;
            [MarshalAs(UnmanagedType.ByValArray, SizeConst = 16)] internal byte[] FileId;
        }

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern SafeFileHandle CreateFileW(
            string lpFileName,
            uint dwDesiredAccess,
            uint dwShareMode,
            IntPtr lpSecurityAttributes,
            uint dwCreationDisposition,
            uint dwFlagsAndAttributes,
            IntPtr hTemplateFile);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetFileInformationByHandleEx(
            SafeFileHandle hFile,
            FILE_INFO_BY_HANDLE_CLASS fileInformationClass,
            IntPtr lpFileInformation,
            uint dwBufferSize);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool ReadFile(
            SafeFileHandle hFile,
            byte[] lpBuffer,
            uint nNumberOfBytesToRead,
            out uint lpNumberOfBytesRead,
            IntPtr lpOverlapped);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern uint GetFinalPathNameByHandleW(
            SafeFileHandle hFile,
            StringBuilder lpszFilePath,
            uint cchFilePath,
            uint dwFlags);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetVolumeInformationByHandleW(
            SafeFileHandle hFile,
            StringBuilder lpVolumeNameBuffer,
            uint nVolumeNameSize,
            out uint lpVolumeSerialNumber,
            out uint lpMaximumComponentLength,
            out uint lpFileSystemFlags,
            StringBuilder lpFileSystemNameBuffer,
            uint nFileSystemNameSize);

        public static StableSnapshot CaptureStable(string requestedRoot)
        {
            string[] phaseNames = new string[] { "B0", "I1", "B1", "I2", "B2" };
            SingleSnapshot baseline = null;
            List<SnapshotPhase> phases = new List<SnapshotPhase>();
            foreach (string phaseName in phaseNames)
            {
                SingleSnapshot current = CaptureOne(requestedRoot);
                if (baseline == null)
                {
                    baseline = current;
                }
                else
                {
                    if (!String.Equals(baseline.ContentManifest, current.ContentManifest, StringComparison.Ordinal))
                    {
                        throw new InvalidOperationException("installed-tree portable content changed at fixed-point phase " + phaseName);
                    }
                    if (!String.Equals(baseline.IdentityManifest, current.IdentityManifest, StringComparison.Ordinal))
                    {
                        throw new InvalidOperationException("installed-tree native identity changed at fixed-point phase " + phaseName);
                    }
                }
                phases.Add(new SnapshotPhase
                {
                    Name = phaseName,
                    ContentSha256 = current.ContentSha256,
                    IdentitySha256 = current.IdentitySha256,
                    FileCount = current.Files.Count,
                    DirectoryCount = current.DirectoryCount,
                    Bytes = current.Bytes
                });
            }
            return new StableSnapshot
            {
                FileSystem = baseline.FileSystem,
                ContentSha256 = baseline.ContentSha256,
                IdentitySha256 = baseline.IdentitySha256,
                FileCount = baseline.Files.Count,
                DirectoryCount = baseline.DirectoryCount,
                Bytes = baseline.Bytes,
                Files = baseline.Files.ToArray(),
                Phases = phases.ToArray()
            };
        }

        private static SingleSnapshot CaptureOne(string requestedRoot)
        {
            if (String.IsNullOrWhiteSpace(requestedRoot) || ContainsControl(requestedRoot))
            {
                throw new ArgumentException("installed-tree root is invalid", "requestedRoot");
            }
            string root = Path.GetFullPath(requestedRoot);
            if (!Directory.Exists(root))
            {
                throw new DirectoryNotFoundException("installed-tree root does not exist");
            }
            List<PortableFile> files = new List<PortableFile>();
            List<string> identities = new List<string>();
            HashSet<string> seenIdentities = new HashSet<string>(StringComparer.Ordinal);
            ulong? expectedVolumeSerial = null;
            string fileSystem = null;
            int directoryCount = 0;
            long totalBytes = 0;
            Visit(
                root,
                root,
                ".",
                files,
                identities,
                seenIdentities,
                ref expectedVolumeSerial,
                ref fileSystem,
                ref directoryCount,
                ref totalBytes);
            if (!String.Equals(fileSystem, "NTFS", StringComparison.Ordinal))
            {
                throw new InvalidOperationException("installed-tree volume must be NTFS");
            }
            files.Sort(delegate(PortableFile left, PortableFile right)
            {
                return CompareUtf8(left.Path, right.Path);
            });
            identities.Sort(CompareUtf8);
            StringBuilder publicManifest = new StringBuilder();
            foreach (PortableFile file in files)
            {
                publicManifest.Append(file.Sha256).Append(' ')
                    .Append(file.Bytes).Append(' ')
                    .Append(file.Path).Append('\n');
            }
            StringBuilder identityManifest = new StringBuilder();
            identityManifest.Append("filesystem=NTFS\n")
                .Append("directories=").Append(directoryCount).Append('\n')
                .Append("files=").Append(files.Count).Append('\n')
                .Append("bytes=").Append(totalBytes).Append('\n');
            foreach (string identity in identities)
            {
                identityManifest.Append(identity).Append('\n');
            }
            return new SingleSnapshot
            {
                FileSystem = fileSystem,
                ContentManifest = publicManifest.ToString(),
                IdentityManifest = identityManifest.ToString(),
                ContentSha256 = HashUtf8(publicManifest.ToString()),
                IdentitySha256 = HashUtf8(identityManifest.ToString()),
                Files = files,
                DirectoryCount = directoryCount,
                Bytes = totalBytes
            };
        }

        private static void Visit(
            string root,
            string fullPath,
            string relativePath,
            List<PortableFile> files,
            List<string> identities,
            HashSet<string> seenIdentities,
            ref ulong? expectedVolumeSerial,
            ref string fileSystem,
            ref int directoryCount,
            ref long totalBytes)
        {
            AssertContained(root, fullPath);
            using (SafeFileHandle handle = OpenEntry(fullPath))
            {
                AssertCanonicalHandlePath(handle, fullPath);
                NativeMetadata before = QueryMetadata(handle);
                if ((before.Attributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0 || before.ReparseTag != 0)
                {
                    throw new InvalidOperationException("installed tree contains a reparse point: " + relativePath);
                }
                if ((before.Attributes & FILE_ATTRIBUTE_DEVICE) != 0)
                {
                    throw new InvalidOperationException("installed tree contains a non-regular device entry: " + relativePath);
                }
                bool attributeDirectory = (before.Attributes & FILE_ATTRIBUTE_DIRECTORY) != 0;
                if (attributeDirectory != before.IsDirectory)
                {
                    throw new InvalidOperationException("installed-tree entry type is inconsistent: " + relativePath);
                }
                if (before.DeletePending)
                {
                    throw new InvalidOperationException("installed-tree entry is delete-pending: " + relativePath);
                }
                if (!before.IsDirectory && before.NumberOfLinks != 1)
                {
                    throw new InvalidOperationException("installed tree contains a hard-linked file: " + relativePath);
                }
                if (expectedVolumeSerial.HasValue && before.VolumeSerial != expectedVolumeSerial.Value)
                {
                    throw new InvalidOperationException("installed-tree entry escaped the root volume: " + relativePath);
                }
                if (!expectedVolumeSerial.HasValue)
                {
                    expectedVolumeSerial = before.VolumeSerial;
                    fileSystem = QueryFileSystem(handle);
                    if (!String.Equals(fileSystem, "NTFS", StringComparison.Ordinal))
                    {
                        throw new InvalidOperationException("installed-tree volume must be NTFS");
                    }
                }
                string identityKey = before.VolumeSerial.ToString("X16") + ":" + before.FileId;
                if (!seenIdentities.Add(identityKey))
                {
                    throw new InvalidOperationException("installed tree contains duplicate native file identity: " + relativePath);
                }

                string fileSha256 = null;
                if (before.IsDirectory)
                {
                    directoryCount = checked(directoryCount + 1);
                    foreach (string child in Directory.EnumerateFileSystemEntries(fullPath, "*", SearchOption.TopDirectoryOnly))
                    {
                        string childName = Path.GetFileName(child);
                        ValidateChildName(childName);
                        string expectedChild = Path.GetFullPath(Path.Combine(fullPath, childName));
                        if (!String.Equals(expectedChild, Path.GetFullPath(child), StringComparison.OrdinalIgnoreCase))
                        {
                            throw new InvalidOperationException("installed-tree child path is not canonical");
                        }
                        string childRelative = relativePath == "." ? childName : relativePath + "/" + childName;
                        ValidateRelativePath(childRelative);
                        Visit(
                            root,
                            expectedChild,
                            childRelative,
                            files,
                            identities,
                            seenIdentities,
                            ref expectedVolumeSerial,
                            ref fileSystem,
                            ref directoryCount,
                            ref totalBytes);
                    }
                }
                else
                {
                    if (before.EndOfFile < 0)
                    {
                        throw new InvalidOperationException("installed-tree file size is invalid: " + relativePath);
                    }
                    fileSha256 = HashSameHandle(handle, before.EndOfFile);
                    totalBytes = checked(totalBytes + before.EndOfFile);
                    files.Add(new PortableFile
                    {
                        Path = "./" + relativePath,
                        Bytes = before.EndOfFile,
                        Sha256 = fileSha256
                    });
                }

                NativeMetadata after = QueryMetadata(handle);
                if (!before.EqualsExact(after))
                {
                    throw new InvalidOperationException("installed-tree entry changed while it was inspected: " + relativePath);
                }
                identities.Add(IdentityLine(relativePath, before, fileSha256));
            }
        }

        private static SafeFileHandle OpenEntry(string fullPath)
        {
            SafeFileHandle handle = CreateFileW(
                fullPath,
                FILE_READ_DATA | FILE_READ_ATTRIBUTES,
                FILE_SHARE_READ,
                IntPtr.Zero,
                OPEN_EXISTING,
                FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT | FILE_FLAG_SEQUENTIAL_SCAN,
                IntPtr.Zero);
            if (handle.IsInvalid)
            {
                int error = Marshal.GetLastWin32Error();
                handle.Dispose();
                throw new Win32Exception(error, "CreateFileW failed for installed-tree entry");
            }
            return handle;
        }

        private static NativeMetadata QueryMetadata(SafeFileHandle handle)
        {
            FILE_BASIC_INFO basic = QueryFixed<FILE_BASIC_INFO>(handle, FILE_INFO_BY_HANDLE_CLASS.FileBasicInfo);
            FILE_STANDARD_INFO standard = QueryFixed<FILE_STANDARD_INFO>(handle, FILE_INFO_BY_HANDLE_CLASS.FileStandardInfo);
            FILE_ATTRIBUTE_TAG_INFO attributeTag = QueryFixed<FILE_ATTRIBUTE_TAG_INFO>(handle, FILE_INFO_BY_HANDLE_CLASS.FileAttributeTagInfo);
            FILE_ID_INFO id = QueryFixed<FILE_ID_INFO>(handle, FILE_INFO_BY_HANDLE_CLASS.FileIdInfo);
            if (basic.FileAttributes != attributeTag.FileAttributes)
            {
                throw new InvalidOperationException("installed-tree native attributes are inconsistent");
            }
            if (id.FileId == null || id.FileId.Length != 16)
            {
                throw new InvalidOperationException("installed-tree native file identity is invalid");
            }
            return new NativeMetadata
            {
                VolumeSerial = id.VolumeSerialNumber,
                FileId = BytesToHex(id.FileId),
                CreationTime = basic.CreationTime,
                LastWriteTime = basic.LastWriteTime,
                ChangeTime = basic.ChangeTime,
                Attributes = basic.FileAttributes,
                ReparseTag = attributeTag.ReparseTag,
                AllocationSize = standard.AllocationSize,
                EndOfFile = standard.EndOfFile,
                NumberOfLinks = standard.NumberOfLinks,
                DeletePending = standard.DeletePending,
                IsDirectory = standard.Directory,
                StreamSignature = QueryStreamSignature(handle)
            };
        }

        private static T QueryFixed<T>(SafeFileHandle handle, FILE_INFO_BY_HANDLE_CLASS informationClass) where T : struct
        {
            int size = Marshal.SizeOf(typeof(T));
            IntPtr buffer = Marshal.AllocHGlobal(size);
            try
            {
                if (!GetFileInformationByHandleEx(handle, informationClass, buffer, (uint)size))
                {
                    throw new Win32Exception(Marshal.GetLastWin32Error(), "GetFileInformationByHandleEx failed for " + informationClass);
                }
                return (T)Marshal.PtrToStructure(buffer, typeof(T));
            }
            finally
            {
                Marshal.FreeHGlobal(buffer);
            }
        }

        private static string QueryStreamSignature(SafeFileHandle handle)
        {
            int size = 4096;
            while (size <= MAX_STREAM_INFO_BYTES)
            {
                IntPtr buffer = Marshal.AllocHGlobal(size);
                try
                {
                    if (!GetFileInformationByHandleEx(handle, FILE_INFO_BY_HANDLE_CLASS.FileStreamInfo, buffer, (uint)size))
                    {
                        int error = Marshal.GetLastWin32Error();
                        if (error == ERROR_HANDLE_EOF)
                        {
                            return "";
                        }
                        if (error == ERROR_INSUFFICIENT_BUFFER || error == ERROR_MORE_DATA)
                        {
                            size = checked(size * 2);
                            continue;
                        }
                        throw new Win32Exception(error, "GetFileInformationByHandleEx failed for FileStreamInfo");
                    }
                    List<string> streams = new List<string>();
                    int offset = 0;
                    while (true)
                    {
                        if (offset < 0 || offset > size - 24)
                        {
                            throw new InvalidOperationException("installed-tree stream metadata is malformed");
                        }
                        IntPtr current = IntPtr.Add(buffer, offset);
                        uint nextOffset = unchecked((uint)Marshal.ReadInt32(current, 0));
                        uint nameLength = unchecked((uint)Marshal.ReadInt32(current, 4));
                        if ((nameLength & 1) != 0 || nameLength > (uint)(size - offset - 24))
                        {
                            throw new InvalidOperationException("installed-tree stream name metadata is malformed");
                        }
                        long streamSize = Marshal.ReadInt64(current, 8);
                        long allocationSize = Marshal.ReadInt64(current, 16);
                        string name = Marshal.PtrToStringUni(IntPtr.Add(current, 24), checked((int)nameLength / 2));
                        if (!String.Equals(name, "::$DATA", StringComparison.Ordinal))
                        {
                            throw new InvalidOperationException("installed tree contains an alternate data stream");
                        }
                        streams.Add(name + "|" + streamSize + "|" + allocationSize);
                        if (nextOffset == 0)
                        {
                            break;
                        }
                        if (nextOffset < 24 + nameLength || nextOffset > (uint)(size - offset))
                        {
                            throw new InvalidOperationException("installed-tree stream offset metadata is malformed");
                        }
                        offset = checked(offset + (int)nextOffset);
                    }
                    if (streams.Count > 1)
                    {
                        throw new InvalidOperationException("installed tree contains multiple data streams");
                    }
                    return streams.Count == 0 ? "" : streams[0];
                }
                finally
                {
                    Marshal.FreeHGlobal(buffer);
                }
            }
            throw new InvalidOperationException("installed-tree stream metadata exceeds the bounded buffer");
        }

        private static string HashSameHandle(SafeFileHandle handle, long expectedBytes)
        {
            byte[] buffer = new byte[HASH_BUFFER_BYTES];
            long total = 0;
            using (SHA256 digest = SHA256.Create())
            {
                while (true)
                {
                    uint read;
                    if (!ReadFile(handle, buffer, (uint)buffer.Length, out read, IntPtr.Zero))
                    {
                        throw new Win32Exception(Marshal.GetLastWin32Error(), "ReadFile failed while hashing installed-tree file");
                    }
                    if (read == 0)
                    {
                        break;
                    }
                    total = checked(total + read);
                    digest.TransformBlock(buffer, 0, checked((int)read), buffer, 0);
                }
                digest.TransformFinalBlock(new byte[0], 0, 0);
                if (total != expectedBytes)
                {
                    throw new InvalidOperationException("installed-tree file size changed while hashing");
                }
                return BytesToHex(digest.Hash).ToLowerInvariant();
            }
        }

        private static string QueryFileSystem(SafeFileHandle handle)
        {
            StringBuilder volumeName = new StringBuilder(261);
            StringBuilder fileSystemName = new StringBuilder(32);
            uint volumeSerial;
            uint maximumComponentLength;
            uint fileSystemFlags;
            if (!GetVolumeInformationByHandleW(
                handle,
                volumeName,
                (uint)volumeName.Capacity,
                out volumeSerial,
                out maximumComponentLength,
                out fileSystemFlags,
                fileSystemName,
                (uint)fileSystemName.Capacity))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "GetVolumeInformationByHandleW failed");
            }
            return fileSystemName.ToString();
        }

        private static void AssertCanonicalHandlePath(SafeFileHandle handle, string expectedPath)
        {
            int capacity = 512;
            while (capacity <= 32768)
            {
                StringBuilder output = new StringBuilder(capacity);
                uint length = GetFinalPathNameByHandleW(handle, output, (uint)output.Capacity, 0);
                if (length == 0)
                {
                    throw new Win32Exception(Marshal.GetLastWin32Error(), "GetFinalPathNameByHandleW failed");
                }
                if (length >= output.Capacity)
                {
                    capacity = checked((int)length + 1);
                    continue;
                }
                string actual = NormalizeFinalPath(output.ToString());
                if (!String.Equals(TrimTrailingSeparators(Path.GetFullPath(expectedPath)), TrimTrailingSeparators(actual), StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("installed-tree handle resolved to a non-canonical path");
                }
                return;
            }
            throw new InvalidOperationException("installed-tree canonical path exceeds the bounded buffer");
        }

        private static string NormalizeFinalPath(string value)
        {
            if (value.StartsWith(@"\\?\UNC\", StringComparison.OrdinalIgnoreCase))
            {
                return @"\\" + value.Substring(8);
            }
            if (value.StartsWith(@"\\?\", StringComparison.OrdinalIgnoreCase))
            {
                return value.Substring(4);
            }
            return value;
        }

        private static string TrimTrailingSeparators(string value)
        {
            string root = Path.GetPathRoot(value);
            while (value.Length > root.Length && (value.EndsWith("\\", StringComparison.Ordinal) || value.EndsWith("/", StringComparison.Ordinal)))
            {
                value = value.Substring(0, value.Length - 1);
            }
            return value;
        }

        private static void AssertContained(string root, string candidate)
        {
            string canonicalRoot = TrimTrailingSeparators(Path.GetFullPath(root));
            string canonicalCandidate = TrimTrailingSeparators(Path.GetFullPath(candidate));
            if (String.Equals(canonicalRoot, canonicalCandidate, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }
            string prefix = canonicalRoot + Path.DirectorySeparatorChar;
            if (!canonicalCandidate.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("installed-tree entry escapes the root");
            }
        }

        private static void ValidateChildName(string name)
        {
            if (String.IsNullOrEmpty(name)
                || String.Equals(name, ".", StringComparison.Ordinal)
                || String.Equals(name, "..", StringComparison.Ordinal)
                || name.EndsWith(".", StringComparison.Ordinal)
                || name.EndsWith(" ", StringComparison.Ordinal)
                || name.IndexOfAny(new char[] { '<', '>', '"', '|', '?', '*' }) >= 0
                || IsReservedDosDeviceName(name)
                || name.IndexOf(':') >= 0
                || name.IndexOf('\\') >= 0
                || name.IndexOf('/') >= 0
                || ContainsControl(name)
                || !String.Equals(name, name.Normalize(NormalizationForm.FormC), StringComparison.Ordinal))
            {
                throw new InvalidOperationException("installed-tree child name is invalid");
            }
        }

        private static bool IsReservedDosDeviceName(string name)
        {
            int extension = name.IndexOf('.');
            string stem = (extension < 0 ? name : name.Substring(0, extension)).TrimEnd(' ', '.');
            if (String.Equals(stem, "CON", StringComparison.OrdinalIgnoreCase)
                || String.Equals(stem, "PRN", StringComparison.OrdinalIgnoreCase)
                || String.Equals(stem, "AUX", StringComparison.OrdinalIgnoreCase)
                || String.Equals(stem, "NUL", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
            return stem.Length == 4
                && (stem.StartsWith("COM", StringComparison.OrdinalIgnoreCase)
                    || stem.StartsWith("LPT", StringComparison.OrdinalIgnoreCase))
                && stem[3] >= '1'
                && stem[3] <= '9';
        }

        private static void ValidateRelativePath(string relativePath)
        {
            if (String.IsNullOrEmpty(relativePath)
                || Path.IsPathRooted(relativePath)
                || relativePath.StartsWith("../", StringComparison.Ordinal)
                || relativePath.Contains("/../")
                || relativePath.Contains("//")
                || relativePath.IndexOf(':') >= 0
                || relativePath.IndexOf('\\') >= 0
                || ContainsControl(relativePath)
                || !String.Equals(relativePath, relativePath.Normalize(NormalizationForm.FormC), StringComparison.Ordinal))
            {
                throw new InvalidOperationException("installed-tree relative path is invalid");
            }
        }

        private static bool ContainsControl(string value)
        {
            foreach (char character in value)
            {
                if (Char.IsControl(character))
                {
                    return true;
                }
            }
            return false;
        }

        private static string IdentityLine(string relativePath, NativeMetadata metadata, string fileSha256)
        {
            string pathBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(relativePath == "." ? "./" : "./" + relativePath));
            return (metadata.IsDirectory ? "D" : "F")
                + "|" + pathBase64
                + "|" + metadata.VolumeSerial.ToString("X16")
                + "|" + metadata.FileId
                + "|" + metadata.CreationTime
                + "|" + metadata.LastWriteTime
                + "|" + metadata.ChangeTime
                + "|" + metadata.Attributes.ToString("X8")
                + "|" + metadata.ReparseTag.ToString("X8")
                + "|" + metadata.AllocationSize
                + "|" + metadata.EndOfFile
                + "|" + metadata.NumberOfLinks
                + "|" + (metadata.DeletePending ? "1" : "0")
                + "|" + metadata.StreamSignature
                + "|" + (fileSha256 ?? "");
        }

        private static int CompareUtf8(string left, string right)
        {
            byte[] leftBytes = Encoding.UTF8.GetBytes(left);
            byte[] rightBytes = Encoding.UTF8.GetBytes(right);
            int common = Math.Min(leftBytes.Length, rightBytes.Length);
            for (int index = 0; index < common; index++)
            {
                int difference = leftBytes[index].CompareTo(rightBytes[index]);
                if (difference != 0)
                {
                    return difference;
                }
            }
            return leftBytes.Length.CompareTo(rightBytes.Length);
        }

        private static string HashUtf8(string value)
        {
            using (SHA256 digest = SHA256.Create())
            {
                return BytesToHex(digest.ComputeHash(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
            }
        }

        private static string BytesToHex(byte[] bytes)
        {
            StringBuilder output = new StringBuilder(bytes.Length * 2);
            foreach (byte value in bytes)
            {
                output.Append(value.ToString("X2"));
            }
            return output.ToString();
        }
    }
}
'@

Add-Type -TypeDefinition $nativeSource -Language CSharp -ErrorAction Stop
$snapshot = [LawFirmOs.WindowsInstalledTree.NativeInstalledTreeSnapshot]::CaptureStable($rootPath)

[ordered]@{
  schema_version = 'law-firm-os.windows-installed-tree-native-snapshot.v1'
  platform = 'win32'
  powershell_version = $PSVersionTable.PSVersion.ToString()
  filesystem = $snapshot.FileSystem
  fixed_point_sequence = @('B0', 'I1', 'B1', 'I2', 'B2')
  fixed_point_exact = $true
  content_sha256 = $snapshot.ContentSha256
  identity_sha256 = $snapshot.IdentitySha256
  file_count = $snapshot.FileCount
  directory_count = $snapshot.DirectoryCount
  bytes = $snapshot.Bytes
  reparse_point_count = 0
  alternate_data_stream_count = 0
  hard_link_count = 0
  files = @($snapshot.Files | ForEach-Object {
    [ordered]@{
      path = $_.Path
      bytes = $_.Bytes
      sha256 = $_.Sha256
    }
  })
  phases = @($snapshot.Phases | ForEach-Object {
    [ordered]@{
      name = $_.Name
      content_sha256 = $_.ContentSha256
      identity_sha256 = $_.IdentitySha256
      file_count = $_.FileCount
      directory_count = $_.DirectoryCount
      bytes = $_.Bytes
    }
  })
} | ConvertTo-Json -Depth 6 -Compress
