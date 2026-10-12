param([Parameter(Mandatory=$true)][int]$OwnedTestPid,
      [Parameter(Mandatory=$true)][int]$RunnerPid,
      [Parameter(Mandatory=$true)][string]$StartedAt,
      [Parameter(Mandatory=$true)][string]$SpawnedAt)
$ErrorActionPreference = 'Stop'
# Local native snapshot; do not use WMI or match global process names.
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class OwnedTestTreeSnapshot {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct Entry {
    public uint Size, Usage, Id;
    public UIntPtr Heap;
    public uint Module, Threads, Parent;
    public int Priority;
    public uint Flags;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=260)] public string Name;
  }
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr CreateToolhelp32Snapshot(uint flags, uint pid);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool Process32FirstW(IntPtr snapshot, ref Entry entry);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool Process32NextW(IntPtr snapshot, ref Entry entry);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateProcess(IntPtr handle, uint code);
  public static void Stop(IntPtr handle) {
    if(!TerminateProcess(handle,1)) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
  }
  public static Entry[] Read() {
    var handle=CreateToolhelp32Snapshot(2,0);
    if(handle==new IntPtr(-1)) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    try {
      var rows=new List<Entry>(); var entry=new Entry(); entry.Size=(uint)Marshal.SizeOf(typeof(Entry));
      if(!Process32FirstW(handle,ref entry)) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
      do {rows.Add(entry);entry.Size=(uint)Marshal.SizeOf(typeof(Entry));} while(Process32NextW(handle,ref entry));
      return rows.ToArray();
    } finally {CloseHandle(handle);}
  }
}
'@
$earliestStart = [datetime]::Parse($StartedAt).ToUniversalTime()
$latestStart = [datetime]::Parse($SpawnedAt).ToUniversalTime().AddMilliseconds(1)
if (($latestStart - $earliestStart).TotalMilliseconds -gt 1000 -or $latestStart -lt $earliestStart) { throw 'Spawn identity window is not narrow enough' }
$ownedRoot = [System.Diagnostics.Process]::GetProcessById($OwnedTestPid)
$null = $ownedRoot.Handle
$rootStart = $ownedRoot.StartTime.ToUniversalTime()
if ($rootStart -lt $earliestStart -or $rootStart -gt $latestStart -or $ownedRoot.ProcessName -ne 'node') { $ownedRoot.Dispose(); throw 'Owned root identity check failed' }
$snapshotAt = [datetime]::UtcNow
$entries = [OwnedTestTreeSnapshot]::Read()
$rootEntry = $entries | Where-Object { [int]$_.Id -eq $OwnedTestPid } | Select-Object -First 1
if ($null -eq $rootEntry -or [int]$rootEntry.Parent -ne $RunnerPid) { $ownedRoot.Dispose(); throw 'Owned root parent identity check failed' }
$runnerProcess = [System.Diagnostics.Process]::GetProcessById($RunnerPid)
if ($runnerProcess.HasExited) { $ownedRoot.Dispose(); throw 'Runner no longer alive' }
$runnerProcess.Dispose()
$verified = @{}
$verified[$OwnedTestPid] = [pscustomobject]@{ Process=$ownedRoot; Depth=0; Id=$OwnedTestPid; CreatedAt=$rootStart }
$considered = @{}
$considered[$OwnedTestPid] = $true
$unresolved = @()
try {
  # A child may join only through an already-held verified parent. Its
  # creation time must follow that actual parent, not a reused numeric PID.
  do {
    $added = $false
    foreach ($entry in $entries) {
      if ($considered.ContainsKey([int]$entry.Id) -or -not $verified.ContainsKey([int]$entry.Parent)) { continue }
      $considered[[int]$entry.Id] = $true
      try {
        $ownedProcess = [System.Diagnostics.Process]::GetProcessById([int]$entry.Id)
        $null = $ownedProcess.Handle
        $createdAt = $ownedProcess.StartTime.ToUniversalTime()
        $heldParent = $verified[[int]$entry.Parent]
        if ($createdAt -lt $heldParent.CreatedAt -or $createdAt -gt $snapshotAt) { $unresolved += [int]$entry.Id; $ownedProcess.Dispose(); continue }
        $verified[[int]$entry.Id] = [pscustomobject]@{ Process=$ownedProcess; Depth=$heldParent.Depth+1; Id=[int]$entry.Id; CreatedAt=$createdAt }
        $added = $true
      } catch [System.ArgumentException] { } # It already exited.
        catch { $unresolved += [int]$entry.Id }
    }
  } while ($added)
  if ($unresolved.Count -gt 0) { throw 'A descendant identity could not be safely verified; no process terminated' }
  $terminated = @()
  foreach ($row in ($verified.Values | Sort-Object Depth -Descending)) {
    try { if (-not $row.Process.HasExited) { [OwnedTestTreeSnapshot]::Stop($row.Process.Handle) }; $terminated += $row.Id }
    catch { $unresolved += $row.Id }
  }
  foreach ($row in $verified.Values) {
    try { if (-not $row.Process.WaitForExit(50)) { $unresolved += $row.Id } } catch { $unresolved += $row.Id }
  }
  [pscustomobject]@{ OwnedTestPid=$OwnedTestPid; Terminated=$terminated; Unresolved=@($unresolved | Select-Object -Unique) } | ConvertTo-Json -Compress
  if ($unresolved.Count -gt 0) { exit 1 }
} finally { foreach ($row in $verified.Values) { $row.Process.Dispose() } }
