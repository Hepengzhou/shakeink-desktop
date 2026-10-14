import type { WizardTemplate } from "../taxonomy"

export interface PlotTemplateSpec {
  id: string
  title: string
  summary: string
  genres?: readonly string[]
  tags?: readonly string[]
  method: string
  steps: readonly string[]
  deliverable: string
}

/** Wizard prompts consume the author's conversation, rather than service variables. */
export function createPlotTemplate(spec: PlotTemplateSpec): WizardTemplate {
  return {
    id: spec.id, cat: "plot", title: spec.title, summary: spec.summary,
    channels: [], genres: [...(spec.genres ?? [])], tags: [...(spec.tags ?? [])],
    prompt: `【剧情】${spec.title}
你是我的剧情策划编辑，请用以下方法把灵感组织成可继续写作的主线，并与同次提供的主题、世界观和角色设定统筹。

【输入与缺省】
读取当前对话中作者给出的定位、篇幅、故事灵感、主角目标、角色关系、世界规则与结局偏好，以作者明确设定为准，不把你的建议当成既定事实。缺少决定性信息时最多问三个针对性问题，同时给一版标注“待作者确认”的候选方案；其余缺项列为假设并继续。按实际篇幅压缩或展开，不要求另填变量，不虚构作者已经提供的资料。

【方法】
${spec.method}

【推进步骤】
${spec.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

【输出】
用中文 Markdown 输出：一句话主线；已知设定与待确认假设；按本方法节点排列的阶段表（阶段、具体事件、角色动机与行动、结果及代价、读者信息或伏笔）；然后交付以下专项内容：
${spec.deliverable}
每个节点写实际可发生的事件与选择，不只复述术语。优先形成约800—1600字的规划，十五节拍或多线等复杂方法可适当延长。只规划，不冒称已经生成或保存小说；与其他创作环节协作，不重复改写它们的设定。

【自检】
逐项检查方法节点是否齐全、因果或认知变化是否成立、人物行动是否有动机、能力与信息是否越界、时间地点是否连续、伏笔承诺是否兑现、结局是否回应主题。发现问题先修正，再列出仍需作者决定的事项。不得靠临时新能力、突然出现的线索或无依据的巧合解决关键问题。`,
  }
}
