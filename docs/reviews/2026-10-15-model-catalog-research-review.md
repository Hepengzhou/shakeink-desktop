# 模型目录调研与产品方案独立审核

审核日期：2026-10-15（Asia/Shanghai）。审核角色：独立子代理 `catalog_research_review`。范围为本次模型配置候选目录修复；未改生产代码、测试或验收台账，未使用真实 Key，未运行全量或付费调用测试。

## 结论

已读取 `docs/model-catalog-fix/01-research.md`、`02-product.md` 及 `desktop/shared/builtin-model-catalog.ts`、`provider-capabilities.ts`、`provider-model-ids.ts`、`desktop/main/model-configuration.ts`、`model-provider-adapters.ts`。调研根因准确，产品/技术方案审核通过，可以进入专项用例审核与 TDD。通过是方案结论，不是代码或供应商账户调用通过。

## 源码证据

1. `builtin-model-catalog.ts` 的 `modelChoices` 先初始化全量静态项再合并远端，远端缺失项无法消失。
2. `model-configuration.ts` 的 `discoverCatalog` 在分页结束后给 OpenAI、Zai、MiniMax 补入 `permission=unknown` 的静态候选，并据此使 `complete=false`。`discoverByteDance` 有相同回补。只改变 UI 的 `complete` 分支无法修复这一因果链。
3. `CatalogResult.complete` 目前同时混有分类未知和人为候选补入语义。增加独立 `authoritative` 表示传输/分页成功是必要边界；能力未知不应导致全量旧种子回补。
4. `provider-model-ids.ts` 仍包含腾讯已明确下线的 `qwen3.5-flash`、`qwen3.5-plus`；其所属列表直接进入可选预设。

## 本次实际读取的官方证据

下表是保守种子候选，逐条官方来源及核对日期的机器可读记录见 `docs/model-catalog-fix/official-seeds-research.json`。不要求维持历史全量。这里只确认供应商公布的精确 API ID 与输出类别，不证明任意 Key 的调用授权。

| 供应商 | 可确认的少量 TEXT ID | 来源与读取证据 |
| --- | --- | --- |
| OpenAI | `gpt-6.1-sol`、`gpt-5.6-sol` | [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol)、[GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol)，实际获取模型页；官网 models 总页也有前者精确 ID |
| Anthropic | `claude-opus-5-5`、`claude-sonnet-5-5` | [Models overview](https://platform.claude.com/docs/en/models/overview)，Claude API ID 表；[Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)，两项当前状态 Active |
| DeepSeek | `deepseek-flash`、`deepseek-v4-pro` | [Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/)，两项官方 API 名；前者是当前版本入口，不能因截图或旧知识判定不存在 |
| Moonshot | `kimi-k3` | [官方 OpenAPI](https://platform.kimi.com/docs/openapi.json)，KimiK3ChatRequest 的 model enum/default 精确列出 |
| Zai/BigModel | 暂不设种子 | BigModel [模型概览](https://docs.bigmodel.cn/cn/guide/start/model-overview) 本轮多次超时。国际 [Z.AI GLM-5.3](https://docs.z.ai/guides/llm/glm-5.3) 及 [官方仓库](https://github.com/zai-org/GLM-5) 可读取，但不足以单独证明当前中国默认端点全部 ID。允许通过 Key 获取该端点的完整目录，不补猜测预设 |
| MiniMax | `MiniMax-M3`、`MiniMax-M2.7` | [OpenAI SDK 官方页](https://platform.minimax.cn/docs/api-reference/text-openai-api)，支持模型表；未把订阅限定 Preview 选作保守种子 |
| Xiaomi | `mimo-v2.6-flash`、`mimo-v2.6-pro` | [List models](https://mimo.mi.com/docs/en-US/api/model/list-models)，官方返回示例精确列出 |
| Google | `gemini-3.8-flash` | [Gemini models](https://ai.google.dev/gemini-api/docs/models)，All Gemini 3 models Endpoint 表。2.5 系列旧账户限制不作为保守新配置种子 |
| xAI | `grok-4.7` | [Grok 4.7](https://docs.x.ai/developers/models/grok-4.7)，实际模型页及 Text 输出信息 |
| Alibaba | `qwen3.8-max`、`qwen3.7-plus` | [文本生成](https://help.aliyun.com/zh/model-studio/text-generation-model)，当前推荐模型表 |
| Tencent | `hy3`、`hy4-preview` | [模型总表](https://cloud.tencent.com/document/product/1823/130051)，2026-10-13 更新语言模型表；[Models API 说明](https://cloud.tencent.com/document/product/1823/130078) 明确需要认证并返回当前平台全部可调用模型及状态 |
| ByteDance/Ark | `doubao-seed-2-1-pro-260915` | [深度思考官方页](https://docs.volcengine.com/docs/ark/deep-thinking?lang=zh)，实际读取的 Chat API 调用示例 |

当前 UI 支持的 IMAGE 入口另确认：OpenAI [GPT-Image-2.5 Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst) 的 `gpt-image-2.5-sunburst`；Ark [图片生成教程](https://docs.volcengine.com/docs/82379/1824121) 实际读取完整能力表，确认 `doubao-seedream-5-0-pro-260628`、`doubao-seedream-5-0-flash-260915` 均支持文生图。其 canonical 页数次只返回页面壳，numeric 官方别名成功返回正文；不将抓取失败视为不存在。

## 下线与不确定项处理

- 腾讯模型总表明确 `qwen3.5-flash`、`qwen3.5-plus` 于 2026-09-08 下线。必须剔除预设，并对误回传的 live/缓存项执行同样过滤。`glm-5v-turbo` 的日期是 2026-10-30，当前日期 2026-10-15 尚未下线；需要生命周期边界，不可把未来日期当成本日已下线事实。
- 当前腾讯总表/API 页不再列出静态表中的 `glm-5.1`、`glm-5-turbo`、`glm-5`、`kimi-k2.5`、`minimax-m2.5`；阿里静态历史大表也多于当前来源表。页面未列出不足以断言全局不存在，但也不足以保证继续作为可选预设，保守种子应不保留这些未经本轮证实项。实时完整目录列出的精确 ID 可按真实类别另行加入。
- Anthropic 官方生命周期当前仍标记原静态 Active 项存在；不依据模型名看起来较新就删除。Sonnet 4.5 的计划下线日是 2026-11-30。受限授权项适合从保守种子移除，而不能复用目录枚举作账户授权证明。

## 实现审核时必须核对

1. 原子快照按供应商、类别、协议、标准化官方端点隔离；不同地域/站点不能污染，自定义目录不写官方快照。
2. 完整空结果是有效更新；未知能力项不猜测，也不能阻止剔除已确定缺失的旧项。失败、取消、非法响应、分页未完不会覆盖旧快照。
3. 在排队持久化真正提交前复查当前操作与取消状态；旧 Key、旧 scope、反序响应不能写回更新之后的快照。
4. 仅白名单公开目录字段入文件；不缓存 Key、草稿、响应正文或账户授权。缓存恢复 permission 为 unknown；更换 Key 不延续受限订阅授权。
5. 已移除 ID 不能通过旧配置、草稿、缓存恢复、能力元数据或静态种子回插；加载/损坏/写入失败据实提示，不能宣称已经持久化。
6. 新目录文件必须进入 `desktop/core/root-ownership.ts`、`root-inventory-paths.ts`、`data-root.ts` 的明确所有权与迁移枚举，专项真实文件系统迁移验证读取结果。

以上边界均与 02-product.md 一致，不新增批准步骤。实际代码、红绿灯及目标系统证据由后续独立代码审核和专项验收给出。
