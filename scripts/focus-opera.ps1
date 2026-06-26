$clientUrl = "http://localhost:3000"

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class OperaWindow {
    public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    public static IntPtr Match = IntPtr.Zero;
    public static bool Find(IntPtr hWnd, IntPtr lParam) {
        if (!IsWindowVisible(hWnd)) return true;
        var sb = new StringBuilder(512);
        GetWindowText(hWnd, sb, 512);
        string title = sb.ToString();
        if (string.IsNullOrWhiteSpace(title)) return true;
        if (title.IndexOf("localhost:3000", StringComparison.OrdinalIgnoreCase) >= 0 ||
            title.IndexOf("PE Falcon", StringComparison.OrdinalIgnoreCase) >= 0 ||
            title.IndexOf("Opera", StringComparison.OrdinalIgnoreCase) >= 0) {
            Match = hWnd;
            return false;
        }
        return true;
    }
}
"@

[OperaWindow]::EnumWindows([OperaWindow+EnumProc]{ param($h, $l) [OperaWindow]::Find($h, $l) }, [IntPtr]::Zero) | Out-Null

if ([OperaWindow]::Match -ne [IntPtr]::Zero) {
    [OperaWindow]::ShowWindow([OperaWindow]::Match, 9) | Out-Null
    [OperaWindow]::SetForegroundWindow([OperaWindow]::Match) | Out-Null
    exit 0
}

$opera = Get-Process opera -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } |
    Select-Object -First 1

if ($opera) {
    [OperaWindow]::ShowWindow($opera.MainWindowHandle, 9) | Out-Null
    [OperaWindow]::SetForegroundWindow($opera.MainWindowHandle) | Out-Null
}
