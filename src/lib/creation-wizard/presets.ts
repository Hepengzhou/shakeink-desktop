import { DEFAULT_FILTERS, type WizardFilters } from "./filter"
export type WizardPreset = "仙侠" | "历史" | "科幻"
const PRESETS: Record<WizardPreset, readonly [string,string,string,string]> = {
  仙侠: ["古典仙侠", "修仙界", "热血", "升级流"],
  历史: ["架空历史", "古代", "正剧", "权谋"],
  科幻: ["星际文明", "星际", "烧脑", "经营"],
}
/** Each opening gets independent tag Sets; no mutation of the shared defaults. */
export function freshWizardFilters(preset?: WizardPreset): WizardFilters {
  const tags = preset ? PRESETS[preset] : []
  return {
    ...DEFAULT_FILTERS,
    ...(preset ? {channel:"男频", length:"长篇", genre:preset} : {}),
    tags: { sub:new Set(tags[0] ? [tags[0]] : []), bg:new Set(tags[1] ? [tags[1]] : []), style:new Set(tags[2] ? [tags[2]] : []), flow:new Set(tags[3] ? [tags[3]] : []) },
  }
}
