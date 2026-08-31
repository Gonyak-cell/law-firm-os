using Microsoft.Win32.SafeHandles;
using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

namespace Amic.Os.Vault.Outlook
{
    internal sealed class AttachRequest
    {
        internal const int MaximumDocumentBytes = 25 * 1024 * 1024;

        public string PipeToken { get; private set; }
        public string NonceSha256 { get; private set; }
        public string RequestId { get; private set; }
        public string InstallationRefSha256 { get; private set; }
        public string ComposeTargetSha256 { get; private set; }
        public long ExpiresAtUnixMilliseconds { get; private set; }
        public string DesktopExecutablePath { get; private set; }
        public object MailItem { get; private set; }

        private AttachRequest() { }

        public static AttachRequest Create(string desktopExecutablePath, object mailItem, long inspectorWindowHandle)
        {
            string requestId = RandomHex(16);
            string composeMaterial = string.Join("|", new[] {
                Process.GetCurrentProcess().Id.ToString(CultureInfo.InvariantCulture),
                inspectorWindowHandle.ToString(CultureInfo.InvariantCulture),
                requestId,
                RandomHex(32),
            });
            string assemblyPath = Path.GetFullPath(typeof(AttachRequest).Assembly.Location);
            string assemblyVersion = typeof(AttachRequest).Assembly.GetName().Version.ToString();
            return new AttachRequest {
                PipeToken = RandomHex(16),
                NonceSha256 = RandomHex(32),
                RequestId = requestId,
                InstallationRefSha256 = Sha256Hex(assemblyPath.ToUpperInvariant() + "|" + assemblyVersion),
                ComposeTargetSha256 = Sha256Hex(composeMaterial),
                ExpiresAtUnixMilliseconds = DateTimeOffset.UtcNow.AddMinutes(5).ToUnixTimeMilliseconds(),
                DesktopExecutablePath = Path.GetFullPath(desktopExecutablePath),
                MailItem = mailItem,
            };
        }

        public string[] CommandLineArguments()
        {
            return new[] {
                "--amic-outlook-attach",
                "--amic-outlook-pipe=" + PipeToken,
                "--amic-outlook-nonce=" + NonceSha256,
                "--amic-outlook-request=" + RequestId,
                "--amic-outlook-installation=" + InstallationRefSha256,
                "--amic-outlook-compose=" + ComposeTargetSha256,
                "--amic-outlook-expires=" + ExpiresAtUnixMilliseconds.ToString(CultureInfo.InvariantCulture),
            };
        }

        private static string RandomHex(int byteCount)
        {
            byte[] bytes = new byte[byteCount];
            using (RandomNumberGenerator random = RandomNumberGenerator.Create()) random.GetBytes(bytes);
            return Hex(bytes);
        }

        internal static string Sha256Hex(string value)
        {
            using (SHA256 sha = SHA256.Create()) return Hex(sha.ComputeHash(Encoding.UTF8.GetBytes(value)));
        }

        internal static string Hex(byte[] bytes)
        {
            StringBuilder value = new StringBuilder(bytes.Length * 2);
            foreach (byte item in bytes) value.Append(item.ToString("x2", CultureInfo.InvariantCulture));
            return value.ToString();
        }
    }

    internal sealed class ExactVersion
    {
        public string document_id { get; set; }
        public string version_id { get; set; }
        public string file_object_id { get; set; }
        public string sha256 { get; set; }
        public long byte_size { get; set; }
        public string mime_type { get; set; }
    }

    internal sealed class PipeMetadata
    {
        public string protocol_version { get; set; }
        public string request_id { get; set; }
        public string nonce_sha256 { get; set; }
        public string installation_ref_sha256 { get; set; }
        public string compose_target_sha256 { get; set; }
        public string attachment_name { get; set; }
        public ExactVersion exact_version { get; set; }
    }

    internal sealed class PendingAttachment
    {
        public AttachRequest Request { get; set; }
        public PipeMetadata Metadata { get; set; }
        public string TempFilePath { get; set; }
        public TaskCompletionSource<bool> HostCompletion { get; private set; }

        public PendingAttachment()
        {
            HostCompletion = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        }
    }

    internal sealed class AttachPipeServer : IDisposable
    {
        private const string ProtocolVersion = "amic-os-classic-outlook-attach.v1";
        private const int MaximumMetadataBytes = 16 * 1024;
        private const int MaximumResponseBytes = 8 * 1024;
        private static readonly byte[] Magic = Encoding.ASCII.GetBytes("AMICVLT1");
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer {
            MaxJsonLength = MaximumMetadataBytes,
        };

        private readonly AttachRequest request;
        private readonly ConcurrentQueue<PendingAttachment> deliveryQueue;
        private readonly CancellationTokenSource cancellation = new CancellationTokenSource();
        private NamedPipeServerStream pipe;
        private string tempFilePath;

        public AttachPipeServer(AttachRequest request, ConcurrentQueue<PendingAttachment> deliveryQueue)
        {
            this.request = request ?? throw new ArgumentNullException(nameof(request));
            this.deliveryQueue = deliveryQueue ?? throw new ArgumentNullException(nameof(deliveryQueue));
        }

        public async Task RunAsync()
        {
            using (CancellationTokenSource timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellation.Token)) {
                TimeSpan remaining = DateTimeOffset.FromUnixTimeMilliseconds(request.ExpiresAtUnixMilliseconds) - DateTimeOffset.UtcNow;
                if (remaining <= TimeSpan.Zero || remaining > TimeSpan.FromMinutes(5)) throw new InvalidOperationException("ATTACH_REQUEST_EXPIRED");
                timeout.CancelAfter(remaining);
                pipe = CreatePipe(request.PipeToken);
                await pipe.WaitForConnectionAsync(timeout.Token).ConfigureAwait(false);
                VerifyDesktopClientProcess(pipe, request.DesktopExecutablePath);
                PendingAttachment pending = await ReadAttachmentAsync(pipe, timeout.Token).ConfigureAwait(false);
                deliveryQueue.Enqueue(pending);
                Task completed = await Task.WhenAny(
                    pending.HostCompletion.Task,
                    Task.Delay(TimeSpan.FromMinutes(2), timeout.Token)
                ).ConfigureAwait(false);
                if (completed != pending.HostCompletion.Task || !pending.HostCompletion.Task.Result) {
                    await WriteFailureAsync(pipe, request.RequestId, "OUTLOOK_ATTACHMENT_FAILED", timeout.Token).ConfigureAwait(false);
                    return;
                }
                await WriteSuccessAsync(pipe, pending.Metadata, timeout.Token).ConfigureAwait(false);
            }
        }

        private static NamedPipeServerStream CreatePipe(string pipeToken)
        {
            SecurityIdentifier sid = WindowsIdentity.GetCurrent().User;
            PipeSecurity security = new PipeSecurity();
            security.SetOwner(sid);
            security.SetAccessRuleProtection(true, false);
            security.AddAccessRule(new PipeAccessRule(sid, PipeAccessRights.FullControl, AccessControlType.Allow));
            return new NamedPipeServerStream(
                "amic-os-vault-" + pipeToken,
                PipeDirection.InOut,
                1,
                PipeTransmissionMode.Byte,
                PipeOptions.Asynchronous,
                64 * 1024,
                64 * 1024,
                security
            );
        }

        private static void VerifyDesktopClientProcess(NamedPipeServerStream server, string expectedPath)
        {
            uint processId;
            if (!GetNamedPipeClientProcessId(server.SafePipeHandle, out processId)) {
                throw new InvalidOperationException("PIPE_CLIENT_PROCESS_UNAVAILABLE");
            }
            using (Process client = Process.GetProcessById(checked((int)processId))) {
                string actualPath = Path.GetFullPath(client.MainModule.FileName);
                if (!string.Equals(actualPath, expectedPath, StringComparison.OrdinalIgnoreCase)) {
                    throw new InvalidOperationException("PIPE_CLIENT_PROCESS_MISMATCH");
                }
            }
        }

        private async Task<PendingAttachment> ReadAttachmentAsync(Stream stream, CancellationToken token)
        {
            byte[] header = await ReadExactlyAsync(stream, 20, token).ConfigureAwait(false);
            for (int index = 0; index < Magic.Length; index++) {
                if (header[index] != Magic[index]) throw new InvalidDataException("PIPE_MAGIC_INVALID");
            }
            uint metadataLength = BitConverter.ToUInt32(header, 8);
            ulong byteLength = BitConverter.ToUInt64(header, 12);
            if (metadataLength < 2 || metadataLength > MaximumMetadataBytes
                || byteLength < 1 || byteLength > AttachRequest.MaximumDocumentBytes) {
                throw new InvalidDataException("PIPE_LENGTH_INVALID");
            }
            byte[] metadataBytes = await ReadExactlyAsync(stream, checked((int)metadataLength), token).ConfigureAwait(false);
            PipeMetadata metadata = Json.Deserialize<PipeMetadata>(Encoding.UTF8.GetString(metadataBytes));
            ValidateMetadata(metadata, checked((long)byteLength));
            tempFilePath = await WriteProtectedTempFileAsync(
                stream,
                checked((long)byteLength),
                metadata.exact_version.sha256,
                metadata.attachment_name,
                token
            ).ConfigureAwait(false);
            return new PendingAttachment {
                Request = request,
                Metadata = metadata,
                TempFilePath = tempFilePath,
            };
        }

        private void ValidateMetadata(PipeMetadata metadata, long byteLength)
        {
            if (metadata == null || metadata.exact_version == null
                || metadata.protocol_version != ProtocolVersion
                || metadata.request_id != request.RequestId
                || metadata.nonce_sha256 != request.NonceSha256
                || metadata.installation_ref_sha256 != request.InstallationRefSha256
                || metadata.compose_target_sha256 != request.ComposeTargetSha256
                || metadata.exact_version.byte_size != byteLength
                || !IsSha256(metadata.exact_version.sha256)
                || !IsSafeAttachmentName(metadata.attachment_name)) {
                throw new InvalidDataException("PIPE_METADATA_MISMATCH");
            }
        }

        private async Task<string> WriteProtectedTempFileAsync(
            Stream source,
            long expectedBytes,
            string expectedSha256,
            string attachmentName,
            CancellationToken token)
        {
            string root = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "AMIC OS",
                "OutlookAttachments"
            );
            EnsurePrivateDirectory(root);
            string extension = Path.GetExtension(attachmentName);
            if (extension.Length > 16 || extension.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0) extension = string.Empty;
            string destination = Path.Combine(root, request.RequestId + extension);
            byte[] buffer = new byte[64 * 1024];
            long written = 0;
            using (SHA256 digest = SHA256.Create())
            using (FileStream output = new FileStream(
                destination,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                buffer.Length,
                FileOptions.WriteThrough
            )) {
                while (written < expectedBytes) {
                    int wanted = (int)Math.Min(buffer.Length, expectedBytes - written);
                    int count = await source.ReadAsync(buffer, 0, wanted, token).ConfigureAwait(false);
                    if (count <= 0) throw new EndOfStreamException("PIPE_BODY_TRUNCATED");
                    await output.WriteAsync(buffer, 0, count, token).ConfigureAwait(false);
                    digest.TransformBlock(buffer, 0, count, null, 0);
                    written += count;
                }
                digest.TransformFinalBlock(new byte[0], 0, 0);
                await output.FlushAsync(token).ConfigureAwait(false);
                if (written != expectedBytes || AttachRequest.Hex(digest.Hash) != expectedSha256) {
                    throw new InvalidDataException("PIPE_BODY_MISMATCH");
                }
            }
            EnsurePrivateFile(destination);
            return destination;
        }

        private static void EnsurePrivateDirectory(string path)
        {
            Directory.CreateDirectory(path);
            SecurityIdentifier sid = WindowsIdentity.GetCurrent().User;
            DirectorySecurity security = new DirectorySecurity();
            security.SetOwner(sid);
            security.SetAccessRuleProtection(true, false);
            security.AddAccessRule(new FileSystemAccessRule(
                sid,
                FileSystemRights.FullControl,
                InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit,
                PropagationFlags.None,
                AccessControlType.Allow
            ));
            new DirectoryInfo(path).SetAccessControl(security);
        }

        private static void EnsurePrivateFile(string path)
        {
            SecurityIdentifier sid = WindowsIdentity.GetCurrent().User;
            FileSecurity security = new FileSecurity();
            security.SetOwner(sid);
            security.SetAccessRuleProtection(true, false);
            security.AddAccessRule(new FileSystemAccessRule(sid, FileSystemRights.FullControl, AccessControlType.Allow));
            new FileInfo(path).SetAccessControl(security);
        }

        private static async Task<byte[]> ReadExactlyAsync(Stream stream, int byteCount, CancellationToken token)
        {
            byte[] result = new byte[byteCount];
            int offset = 0;
            while (offset < byteCount) {
                int count = await stream.ReadAsync(result, offset, byteCount - offset, token).ConfigureAwait(false);
                if (count <= 0) throw new EndOfStreamException("PIPE_FRAME_TRUNCATED");
                offset += count;
            }
            return result;
        }

        private static async Task WriteSuccessAsync(Stream stream, PipeMetadata metadata, CancellationToken token)
        {
            await WriteResponseAsync(stream, new {
                protocol_version = ProtocolVersion,
                state = "attached",
                request_id = metadata.request_id,
                sha256 = metadata.exact_version.sha256,
                byte_size = metadata.exact_version.byte_size,
                attachment_name = metadata.attachment_name,
            }, token).ConfigureAwait(false);
        }

        private static async Task WriteFailureAsync(Stream stream, string requestId, string safeErrorCode, CancellationToken token)
        {
            await WriteResponseAsync(stream, new {
                protocol_version = ProtocolVersion,
                state = "failed",
                request_id = requestId,
                safe_error_code = safeErrorCode,
            }, token).ConfigureAwait(false);
        }

        private static async Task WriteResponseAsync(Stream stream, object value, CancellationToken token)
        {
            byte[] body = Encoding.UTF8.GetBytes(Json.Serialize(value));
            if (body.Length < 2 || body.Length > MaximumResponseBytes) throw new InvalidDataException("PIPE_RESPONSE_INVALID");
            byte[] header = BitConverter.GetBytes((uint)body.Length);
            await stream.WriteAsync(header, 0, header.Length, token).ConfigureAwait(false);
            await stream.WriteAsync(body, 0, body.Length, token).ConfigureAwait(false);
            await stream.FlushAsync(token).ConfigureAwait(false);
        }

        private static bool IsSha256(string value)
        {
            if (value == null || value.Length != 64) return false;
            foreach (char item in value) if (!((item >= '0' && item <= '9') || (item >= 'a' && item <= 'f'))) return false;
            return true;
        }

        private static bool IsSafeAttachmentName(string value)
        {
            if (string.IsNullOrWhiteSpace(value) || value.Length > 240 || value != value.Trim()) return false;
            if (value.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0 || value.Contains("\\") || value.Contains("/")) return false;
            foreach (char item in value) if (char.IsControl(item)) return false;
            return true;
        }

        public void Dispose()
        {
            cancellation.Cancel();
            if (pipe != null) pipe.Dispose();
            if (!string.IsNullOrEmpty(tempFilePath)) {
                try { File.Delete(tempFilePath); } catch { }
            }
            cancellation.Dispose();
        }

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetNamedPipeClientProcessId(
            SafePipeHandle pipe,
            out uint clientProcessId
        );
    }
}
