# 小说创作向导上下文错误调研

点击仙侠入口、选择向导模板并发送后，报错发生在本地上下文安全检查。已证实 DeepSeek 型号目录漏登了窗口容量，未知容量被按 16k 处理，而固定创作提示已经超过这个预算。截图当轮是否走了这个路径，仍须核对实际调用型号。

## 调用链与证据

`CreateNovelDialog.tsx` 的确认操作通过 `composeWizardDraft` 拼接四类模板与作品定位；`ChatPanel.tsx` 首次发送创建本地作品，然后调用 `desktop/handlers/chat/route.ts`。真实 React 向导与 composer 均继续复用。

`desktop/shared/provider-capabilities.ts` 第 50 行的两个 DeepSeek 项仅登记思考档位，缺少 `contextWindow`。目录解析优先供应商返回的容量，再用官方元数据补全；两者都缺少时保存为 0。`desktop/service/models.ts` 第 50 行把 0 转为 16000；`src/lib/ai/context-budget.ts` 为此预留 4000 输出 token，有效输入仅 12000。

独立子代理按源码相同 CJK 估算公式测得：默认 `chat.system` 10593 token，`STORY_WORKFLOW_PROMPT` 2497 token，两段合计 13090，尚未包含作品上下文、向导消息和工具。按真实 `estimateToolTokens` 测量，97 个工具合计 32526 token，按需加载的初始工具为 9008 token。路由在 16k 路径预留 8800 token 的工具与步骤空间，系统和消息只剩约 3200。因此仅清空聊天、重试或减少向导模板无法解决根因。

`src/lib/ai/context-protection.ts` 的 `ContextBudgetError` 与截图错误文字一致；它也用于保真记录与每步输入检查，不能直接删除检查或静默截断作者要求。

## 官方型号与容量

2026 年 10 月 13 日核对 [DeepSeek 官方型号说明](https://api-docs.deepseek.com/quick_start/pricing/)：API 型号为 `deepseek-flash` 与 `deepseek-v4-pro`，两者窗口为 1M，支持工具调用；旧 Flash 名称被映射到当前 Flash。内置候选目录不代表当前 Key 的实际权限，验收必须另读官方 `/models` 并实际调用指定型号。

## 修复范围与验收

本机只读公开配置显示 Flash 已保存容量 1048576，Pro 保存容量 0；作者确认没有手动调整过 Flash 容量。因此不能直接认定截图的实际任务使用了 0 容量 Flash。向导会调用 `resetConversation`，重建全局默认模型选择；重试则沿用原任务快照。这些行为可能让界面之前的选择与实际任务不同，需要在隔离 Electron 中记录请求与实际回执的型号，禁止把当前配置状态倒推为截图当时状态。

补全精确型号的官方容量；对已保存容量为 0 的官方端点配置，在运行时补全，保留用户已明确设置的容量与授权快照。未知型号、代理地址和自定义供应商不得凭型号字符串继承百万窗口。随后从仙侠向导开始，验证简报、主题、世界、人物、剧情、大纲细纲和正文保存；真实端点验证与受控测试分别记录。

所有测试作品使用隔离临时目录。真实 Key 只在本地主进程的系统密钥保护和内存中使用，真实作品内容与 Key 不进入代码、日志或证据。当前调研不是完整流程通过声明。
