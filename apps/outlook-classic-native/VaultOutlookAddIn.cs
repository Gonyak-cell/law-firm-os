using Microsoft.Win32;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Amic.Os.Vault.Outlook
{
    [ComVisible(true)]
    [Guid("F6C72FE5-325E-49D6-9D1A-1D15122F6D88")]
    [ProgId("AMIC.OS.Vault.Outlook")]
    [ClassInterface(ClassInterfaceType.None)]
    [ComDefaultInterface(typeof(IVaultOutlookRibbonCallbacks))]
    public sealed class VaultOutlookAddIn : IDTExtensibility2, IRibbonExtensibility, IVaultOutlookRibbonCallbacks
    {
        private const string ComposeRibbonId = "Microsoft.Outlook.Mail.Compose";
        private const string DesktopRegistryPath = @"Software\AMIC\AMIC OS";
        private const string DesktopRegistryValue = "DesktopExecutable";
        private const int OutlookMailItemClass = 43;
        private const int OutlookByValue = 1;

        private readonly ConcurrentQueue<PendingAttachment> deliveryQueue = new ConcurrentQueue<PendingAttachment>();
        private readonly ConcurrentDictionary<string, AttachPipeServer> activeServers = new ConcurrentDictionary<string, AttachPipeServer>();
        private object outlookApplication;
        private Timer deliveryTimer;

        public void OnConnection(object application, int connectMode, object addInInstance, ref Array custom)
        {
            outlookApplication = application;
            deliveryTimer = new Timer { Interval = 100 };
            deliveryTimer.Tick += DeliverPendingAttachments;
            deliveryTimer.Start();
            CleanupProtectedTemp();
        }

        public void OnDisconnection(int removeMode, ref Array custom)
        {
            DisposeRuntime();
        }

        public void OnAddInsUpdate(ref Array custom) { }
        public void OnStartupComplete(ref Array custom) { }

        public void OnBeginShutdown(ref Array custom)
        {
            DisposeRuntime();
        }

        public string GetCustomUI(string ribbonId)
        {
            if (!string.Equals(ribbonId, ComposeRibbonId, StringComparison.Ordinal)) return null;
            return @"<customUI xmlns=""http://schemas.microsoft.com/office/2009/07/customui"">
  <ribbon>
    <tabs>
      <tab idMso=""TabNewMailMessage"">
        <group id=""AmicOsVaultGroup"" label=""AMIC OS"">
          <button id=""AmicOsVaultAttach"" label=""Vault에서 첨부"" size=""large"" imageMso=""AttachFile"" onAction=""OnAttachFromVault"" screentip=""Vault에서 현재 버전 첨부"" supertip=""AMIC OS를 열어 Vault 문서의 정확한 현재 버전을 이 초안에 첨부합니다."" />
        </group>
      </tab>
    </tabs>
  </ribbon>
</customUI>";
        }

        public void OnAttachFromVault(object control)
        {
            try {
                dynamic application = outlookApplication;
                dynamic inspector = application == null ? null : application.ActiveInspector();
                dynamic mailItem = inspector == null ? null : inspector.CurrentItem;
                if (mailItem == null || Convert.ToInt32(mailItem.Class) != OutlookMailItemClass || Convert.ToBoolean(mailItem.Sent)) {
                    ShowClickError("현재 작성 중인 새 메일 또는 회신 초안에서만 Vault 문서를 첨부할 수 있습니다.");
                    return;
                }
                string desktopExecutable = ResolveDesktopExecutable();
                if (desktopExecutable == null) {
                    ShowClickError("AMIC OS 설치를 확인할 수 없습니다. AMIC OS를 다시 설치한 뒤 시도하세요.");
                    return;
                }
                long inspectorWindowHandle = 0;
                try { inspectorWindowHandle = Convert.ToInt64(inspector.HWND); } catch { }
                AttachRequest request = AttachRequest.Create(desktopExecutable, mailItem, inspectorWindowHandle);
                AttachPipeServer server = new AttachPipeServer(request, deliveryQueue);
                if (!activeServers.TryAdd(request.RequestId, server)) {
                    server.Dispose();
                    return;
                }
                Task serverTask = server.RunAsync();
                serverTask.ContinueWith(_ => {
                    AttachPipeServer removed;
                    if (activeServers.TryRemove(request.RequestId, out removed)) removed.Dispose();
                }, TaskScheduler.Default);
                try {
                    Process.Start(new ProcessStartInfo {
                        FileName = desktopExecutable,
                        Arguments = string.Join(" ", request.CommandLineArguments()),
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        WorkingDirectory = Path.GetDirectoryName(desktopExecutable),
                    });
                }
                catch {
                    AttachPipeServer removed;
                    if (activeServers.TryRemove(request.RequestId, out removed)) removed.Dispose();
                    throw;
                }
            }
            catch {
                ShowClickError("AMIC OS에서 Vault 문서 선택을 시작하지 못했습니다. 잠시 후 다시 시도하세요.");
            }
        }

        private void DeliverPendingAttachments(object sender, EventArgs eventArgs)
        {
            PendingAttachment pending;
            while (deliveryQueue.TryDequeue(out pending)) {
                bool attached = false;
                object attachment = null;
                object attachments = null;
                try {
                    dynamic mailItem = pending.Request.MailItem;
                    if (mailItem == null || Convert.ToBoolean(mailItem.Sent)) throw new InvalidOperationException("MAIL_ITEM_UNAVAILABLE");
                    attachments = mailItem.Attachments;
                    dynamic dynamicAttachments = attachments;
                    attachment = dynamicAttachments.Add(
                        pending.TempFilePath,
                        OutlookByValue,
                        Type.Missing,
                        pending.Metadata.attachment_name
                    );
                    dynamic dynamicAttachment = attachment;
                    long attachedBytes = Convert.ToInt64(dynamicAttachment.Size);
                    string attachedName = Convert.ToString(dynamicAttachment.DisplayName);
                    attached = attachedBytes == pending.Metadata.exact_version.byte_size
                        && string.Equals(attachedName, pending.Metadata.attachment_name, StringComparison.Ordinal);
                }
                catch {
                    attached = false;
                }
                finally {
                    ReleaseComObject(attachment);
                    ReleaseComObject(attachments);
                    pending.HostCompletion.TrySetResult(attached);
                }
            }
        }

        private static string ResolveDesktopExecutable()
        {
            using (RegistryKey key = Registry.CurrentUser.OpenSubKey(DesktopRegistryPath, false)) {
                string configured = key == null ? null : key.GetValue(DesktopRegistryValue) as string;
                if (!string.IsNullOrWhiteSpace(configured)) {
                    string fullPath = Path.GetFullPath(configured);
                    if (File.Exists(fullPath) && string.Equals(Path.GetExtension(fullPath), ".exe", StringComparison.OrdinalIgnoreCase)) return fullPath;
                }
            }
            string assemblyDirectory = Path.GetDirectoryName(typeof(VaultOutlookAddIn).Assembly.Location);
            string fallback = Path.GetFullPath(Path.Combine(assemblyDirectory, "..", "..", "matter.exe"));
            return File.Exists(fallback) ? fallback : null;
        }

        private static void CleanupProtectedTemp()
        {
            string root = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "AMIC OS",
                "OutlookAttachments"
            );
            if (!Directory.Exists(root)) return;
            foreach (string path in Directory.GetFiles(root)) {
                try { File.Delete(path); } catch { }
            }
        }

        private static void ShowClickError(string message)
        {
            MessageBox.Show(message, "AMIC OS", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private static void ReleaseComObject(object value)
        {
            if (value == null || !Marshal.IsComObject(value)) return;
            try { Marshal.ReleaseComObject(value); } catch { }
        }

        private void DisposeRuntime()
        {
            if (deliveryTimer != null) {
                deliveryTimer.Stop();
                deliveryTimer.Tick -= DeliverPendingAttachments;
                deliveryTimer.Dispose();
                deliveryTimer = null;
            }
            foreach (KeyValuePair<string, AttachPipeServer> entry in activeServers) entry.Value.Dispose();
            activeServers.Clear();
            ReleaseComObject(outlookApplication);
            outlookApplication = null;
            CleanupProtectedTemp();
        }
    }
}
