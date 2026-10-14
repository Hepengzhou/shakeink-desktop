import type { WizardTemplate } from "../taxonomy"
import { THEME_A_TEMPLATES } from "./theme-a"
import { THEME_B_TEMPLATES } from "./theme-b"
import { WORLD_A_TEMPLATES } from "./world-a"
import { WORLD_B_TEMPLATES } from "./world-b"
import { CHAR_A_TEMPLATES } from "./char-a"
import { CHAR_B_TEMPLATES } from "./char-b"
import { PLOT_A_TEMPLATES } from "./plot-a"
import { PLOT_B_TEMPLATES } from "./plot-b"
import { PLOT_LIBRARY_TEMPLATES } from "./plot-library"
import { curateTemplate } from "./curation"

const originalTemplates: readonly WizardTemplate[] = [
  ...THEME_A_TEMPLATES,
  ...THEME_B_TEMPLATES,
  ...WORLD_A_TEMPLATES,
  ...WORLD_B_TEMPLATES,
  ...CHAR_A_TEMPLATES,
  ...CHAR_B_TEMPLATES,
  ...PLOT_A_TEMPLATES,
  ...PLOT_B_TEMPLATES,
]

const focusedById = new Map(PLOT_LIBRARY_TEMPLATES.map(template => [template.id, template]))
const originalIds = new Set(originalTemplates.map(template => template.id))

export const WIZARD_TEMPLATES: readonly WizardTemplate[] = [
  ...originalTemplates.map(template => focusedById.get(template.id) ?? curateTemplate(template)),
  ...PLOT_LIBRARY_TEMPLATES.filter(template => !originalIds.has(template.id)),
]
