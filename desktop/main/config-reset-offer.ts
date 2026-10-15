/** Last-resort offer for an unrepairable config root: a degraded real workbench
 * opens from a throwaway root, then a modal wipe-or-quit choice. The host seam
 * carries every side effect so the whole flow is testable in plain node. */
export interface ConfigResetOfferHost {
  /** Opens the real main window against a temporary isolated root; rejects on failure. */
  launchDegradedWorkbench(): Promise<unknown>
  /** Modal offer on that window; true means the user chose wipe-and-restart. */
  confirm(input: { reason: string; rootPath: string; window: unknown }): Promise<boolean>
  /** Deletes every file of the broken config root and its bootstrap controls. */
  wipe(): Promise<void>
  relaunch(): void
  quit(): void
  fatal(error: unknown): void
}
export interface ConfigResetOfferInput { reason: string; rootPath: string; host: ConfigResetOfferHost }
export async function offerConfigReset(input: ConfigResetOfferInput): Promise<void> {
  let window: unknown
  try { window = await input.host.launchDegradedWorkbench() } catch (error) { input.host.fatal(error); return }
  let clear = false
  try { clear = await input.host.confirm({ reason: input.reason, rootPath: input.rootPath, window }) } catch { clear = false }
  if (!clear) { input.host.quit(); return }
  try { await input.host.wipe() } catch (error) { input.host.fatal(error); return }
  input.host.relaunch()
}
