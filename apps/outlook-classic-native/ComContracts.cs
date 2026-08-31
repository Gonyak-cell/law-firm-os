using System;
using System.Runtime.InteropServices;

namespace Amic.Os.Vault.Outlook
{
    [ComImport]
    [Guid("B65AD801-ABAF-11D0-BB8B-00A0C90F2744")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IDTExtensibility2
    {
        void OnConnection(
            [MarshalAs(UnmanagedType.IDispatch)] object application,
            int connectMode,
            [MarshalAs(UnmanagedType.IDispatch)] object addInInstance,
            ref Array custom);

        void OnDisconnection(int removeMode, ref Array custom);
        void OnAddInsUpdate(ref Array custom);
        void OnStartupComplete(ref Array custom);
        void OnBeginShutdown(ref Array custom);
    }

    [ComImport]
    [Guid("000C0396-0000-0000-C000-000000000046")]
    [InterfaceType(ComInterfaceType.InterfaceIsDual)]
    public interface IRibbonExtensibility
    {
        [DispId(1)]
        [return: MarshalAs(UnmanagedType.BStr)]
        string GetCustomUI([MarshalAs(UnmanagedType.BStr)] string ribbonId);
    }

    [ComVisible(true)]
    [Guid("7729EE12-4CF4-42D2-89BC-18D0EBD62919")]
    [InterfaceType(ComInterfaceType.InterfaceIsIDispatch)]
    public interface IVaultOutlookRibbonCallbacks
    {
        [DispId(1)]
        void OnAttachFromVault([MarshalAs(UnmanagedType.IDispatch)] object control);
    }
}
