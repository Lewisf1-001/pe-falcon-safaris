$clientUrl = "http://localhost:3000"

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class ChromeWindow {
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
            title.IndexOf("Google Chrome", StringComparison.OrdinalIgnoreCase) >= 0) {
            Match = hWnd;
            return false;
        }
        return true;
    }
}
"@

[ChromeWindow]::EnumWindows([ChromeWindow+EnumProc]{ param($h, $l) [ChromeWindow]::Find($h, $l) }, [IntPtr]::Zero) | Out-Null

if ([ChromeWindow]::Match -ne [IntPtr]::Zero) {
    [ChromeWindow]::ShowWindow([ChromeWindow]::Match, 9) | Out-Null
    [ChromeWindow]::SetForegroundWindow([ChromeWindow]::Match) | Out-Null
    exit 0
}

$chrome = Get-Process chrome -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } |
    Select-Object -First 1

if ($chrome) {
    [ChromeWindow]::ShowWindow($chrome.MainWindowHandle, 9) | Out-Null
    [ChromeWindow]::SetForegroundWindow($chrome.MainWindowHandle) | Out-Null
}
