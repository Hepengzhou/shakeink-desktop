# 模型目录真实性与刷新持久化调研

日期：2026-10-15（Asia/Shanghai）。范围仅为配置模型的候选目录；用户明确禁止全量测试，本轮以专项用例覆盖。

## 已确认的原因

1. `desktop/shared/builtin-model-catalog.ts` 的 `modelChoices` 从全部内置项开始，再追加在线项。因此目录成功读取后缺失的内置型号不会消失。
2. `desktop/main/model-configuration.ts` 的 `discoverCatalog` 给 OpenAI、智谱、MiniMax 回补官网候选；`desktop/main/model-provider-adapters.ts` 的 `discoverByteDance` 同样回补静态 ID。这样无法依据官方返回识别缺失型号。
3. `src/components/desktop/ModelConfigurationDialog.tsx` 仅在组件状态中保留目录，重开即丢失；还会把草稿中的缺失型号重新插进选项。已有配置允许绕过不可用校验。
4. 主进程目前没有目录持久化服务；模型、Key 的保存另由 ModelRepository 管理。目录更新不能隐式保存用户的模型草稿或 Key。

## 官方证据及边界

- [DeepSeek 模型与定价](https://api-docs.deepseek.com/quick_start/pricing/) 于本日读取仍公布 `deepseek-flash`、`deepseek-v4-pro`，旧 Flash 别名映射到新模型。截图不足以证明 `deepseek-flash` 不存在，不凭名字替换。本文不证明用户当前 Key 的调用权限。
- [DeepSeek Models API](https://api-docs.deepseek.com/api/list-models/) 明确返回当前可用型号与能力元数据。
- [OpenAI Models API](https://developers.openai.com/api/reference/resources/models/methods/list) 为官方模型目录入口。目录读取和一次付费调用是两种不同证据；不能把列出解释为当前 Key 已成功调用。
- [腾讯模型总表](https://cloud.tencent.com/document/product/1823/130051) 已公布 `qwen3.5-flash`、`qwen3.5-plus` 于 2026-09-08 下线。源码静态目录仍包含这些项，独立研究审核将记录对应原文及其余供应商核对。
- 旧静态目录含有无法在当前官方来源复核的型号。用户不要求预设全量，采用较小、逐条有当前官方证据的内置种子；不继续推荐未经复核的历史集合。完整实时目录仍来自供应商 API。

## 技术结论

以成功且传输完整的官方目录替换该供应商/类别/协议/端点的候选集合，不再做静态回补。能力未知的型号不猜测类别、不推荐，但不妨碍剔除完整目录中确实缺失的旧项：`authoritative` 表示分页完整，原有 `complete` 保留分类完整的意义。

刷新成功自动原子保存不含凭据的目录快照，独立于手动保存模型。离线、无 Key、清空 Key、重开对话框及重启均使用已保存快照；空快照也是有效结果，不能回到初始种子。401、网络错误、取消、分页截断和格式错误均不修改快照。磁盘读取损坏必须显示错误并停止种子回退，防止被剔除项复活。

目录只确认型号存在；本轮不执行付费调用、不读取真实 Key。真实 Windows Electron 验证使用隔离数据及公开夹具，供应商 API 行为用定向协议测试验证，二者分别报告。
