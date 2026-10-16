import Foundation
import CoreGraphics

// Read-only lookup for the app process started by launch-demo.mjs.
let processID = Int(CommandLine.arguments[1])!
let windows = (CGWindowListCopyWindowInfo(.optionOnScreenOnly, kCGNullWindowID) as? [[String: Any]] ?? []).filter {
    ($0[kCGWindowOwnerPID as String] as? Int) == processID &&
    ($0[kCGWindowName as String] as? String) == "玄印写作" &&
    ($0[kCGWindowLayer as String] as? Int) == 0
}
guard windows.count == 1, let identifier = windows[0][kCGWindowNumber as String] as? Int else {
    fputs("Expected exactly one owned ShakeInk workbench window\n", stderr)
    exit(1)
}
print(identifier)
