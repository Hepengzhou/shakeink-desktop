export type BrandFamily = "legacy" | "current"
export interface BrandNames {
  family: BrandFamily; appMarker: string; appIdentity: "Xuanxiangxiezuo-Desktop" | "ShakeInk"
  workManifest: string; storage: string; storageRequired: string; lock: string; audit: string; auditType: string
  leaseTemporaryPrefix: string; restores: string; preserved: string; migrationStagePrefix: string; rootRecoveryPrefix: string
}
/** Historical values are file protocols, never product display text. */
export const LEGACY_NAMES: Readonly<BrandNames> = Object.freeze({ family: "legacy", appMarker: "xuanxiang-app.json", appIdentity: "Xuanxiangxiezuo-Desktop", workManifest: "xuanxiang-work.json", storage: "xuanxiang-storage.json", storageRequired: "xuanxiang-storage-required.json", lock: ".xuanxiang-lock", audit: ".xuanxiang-lease-recovery.json", auditType: "xuanxiang-work-lease-recovery", leaseTemporaryPrefix: ".xuanxiang-lease-recovery-", restores: ".xuanxiang-restores", preserved: ".xuanxiang-preserved", migrationStagePrefix: ".xuanxiang-migration-", rootRecoveryPrefix: ".xuanxiang-root-recovery-" })
export const CURRENT_NAMES: Readonly<BrandNames> = Object.freeze({ family: "current", appMarker: "shakeink-app.json", appIdentity: "ShakeInk", workManifest: "shakeink-work.json", storage: "shakeink-storage.json", storageRequired: "shakeink-storage-required.json", lock: ".shakeink-lock", audit: ".shakeink-lease-recovery.json", auditType: "shakeink-work-lease-recovery", leaseTemporaryPrefix: ".shakeink-lease-recovery-", restores: ".shakeink-restores", preserved: ".shakeink-preserved", migrationStagePrefix: ".shakeink-migration-", rootRecoveryPrefix: ".shakeink-root-recovery-" })
export const BRAND_NAMES = Object.freeze([LEGACY_NAMES, CURRENT_NAMES])
export const otherBrandNames = (names: Readonly<BrandNames>) => names.family === "legacy" ? CURRENT_NAMES : LEGACY_NAMES
/** Journal validation is pure and must not read a source already cleaned up. */
export function migrationBrandNames(stage: string, id: string): Readonly<BrandNames> {
  const names = BRAND_NAMES.find(value => stage === value.migrationStagePrefix + id)
  if (!names) throw Error("JOURNAL_INVALID")
  return names
}
