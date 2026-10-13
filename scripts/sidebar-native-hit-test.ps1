param([Parameter(Mandatory=$true)][long]$WindowHandle,[Parameter(Mandatory=$true)][string]$PointsJson)
$ErrorActionPreference = 'Stop'
if (-not ('SidebarNativeHitTest' -as [type])) { Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class SidebarNativeHitTest {
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hwnd, ref POINT point);
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern IntPtr GetThreadDpiAwarenessContext();
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll")] public static extern bool AreDpiAwarenessContextsEqual(IntPtr first,IntPtr second);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessageW(IntPtr hwnd,uint message,IntPtr wparam,IntPtr lparam);
}
'@ }
$sidebarWindow = [IntPtr]::new($WindowHandle)
if (-not [SidebarNativeHitTest]::IsWindow($sidebarWindow)) { throw 'Isolated test window no longer exists' }
$sidebarDpiContext = [IntPtr]::new(-4)
$sidebarPreviousContext = [SidebarNativeHitTest]::SetThreadDpiAwarenessContext($sidebarDpiContext)
if ($sidebarPreviousContext -eq [IntPtr]::Zero) { throw 'Unable to establish per-monitor-v2 DPI awareness for the native probe' }
try {
if (-not [SidebarNativeHitTest]::AreDpiAwarenessContextsEqual([SidebarNativeHitTest]::GetThreadDpiAwarenessContext(),$sidebarDpiContext)) { throw 'Native probe DPI awareness context was not applied' }
$sidebarOrigin = [SidebarNativeHitTest+POINT]::new()
if (-not [SidebarNativeHitTest]::ClientToScreen($sidebarWindow,[ref]$sidebarOrigin)) { throw 'Unable to measure actual window client origin' }
$sidebarDpi = [SidebarNativeHitTest]::GetDpiForWindow($sidebarWindow)
$sidebarPoints = $PointsJson | ConvertFrom-Json
$sidebarResults = foreach ($sidebarPoint in $sidebarPoints) {
  # Input coordinates are rendered CSS pixels multiplied by Electron zoom.
  # Convert client DIPs to physical pixels for the actual HWND hit-test.
  $sidebarX = $sidebarOrigin.X + [int][Math]::Round([double]$sidebarPoint.x * $sidebarDpi / 96)
  $sidebarY = $sidebarOrigin.Y + [int][Math]::Round([double]$sidebarPoint.y * $sidebarDpi / 96)
  $sidebarPacked = ([long]($sidebarY -band 65535) -shl 16) -bor ($sidebarX -band 65535)
  $sidebarHit = [SidebarNativeHitTest]::SendMessageW($sidebarWindow,0x0084,[IntPtr]::Zero,[IntPtr]::new($sidebarPacked)).ToInt64()
  [pscustomobject]@{label=$sidebarPoint.label;clientDipX=$sidebarPoint.x;clientDipY=$sidebarPoint.y;screenX=$sidebarX;screenY=$sidebarY;hit=$sidebarHit}
}
[pscustomobject]@{scope='Actual Windows HWND WM_NCHITTEST; no simulated platform styles or DOM hit-test';threadDpiAwareness='PER_MONITOR_AWARE_V2';previousThreadDpiContext=$sidebarPreviousContext.ToInt64();dpi=$sidebarDpi;clientOrigin=@{x=$sidebarOrigin.X;y=$sidebarOrigin.Y};points=@($sidebarResults)} | ConvertTo-Json -Depth 5 -Compress
} finally { [void][SidebarNativeHitTest]::SetThreadDpiAwarenessContext($sidebarPreviousContext) }
