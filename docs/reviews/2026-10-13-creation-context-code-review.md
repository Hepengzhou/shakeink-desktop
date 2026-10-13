# 小说创作向导上下文容量修复独立代码审核

审核日期：2026-10-13（Asia/Shanghai）。限定实现审核范围：`desktop/shared/provider-capabilities.ts`、`desktop/service/models.ts`、`tests/unit/creation-context.test.ts`；另核对本次方案与用例文档。未修改其他文件、真实配置、作品或 Key。

## 结论

容量修复代码审核通过，未发现此实现范围内的阻塞缺陷。该结论只认可已确定的官方零容量配置缺陷修复；用户明确容量 Flash 的实际截图根因、完整供应商创作流程及正文重开验收尚未由本审核证明。

## 源码核查

- `provider-capabilities.ts:51` 仅为两个精确 DeepSeek 官方 TEXT 型号登记 1000000 窗口，没有改变旧型号类别、思考档位或其他供应商能力。
- `provider-capabilities.ts:75–81` 的运行时补全先限定 deepseek/OpenAI/TEXT，再解析 URL；只接受 HTTPS、`api.deepseek.com` 精确主机、无非默认端口/用户信息/查询/片段及 `/`、`/v1`、`/v1/`。未知型号仍由精确 metadata map 返回 undefined。默认 HTTPS :443 经 URL 规范化后符合既定许可。
- `models.ts:52` 明确配置容量优先，官方零容量其次，未知模型继续使用 16000。明确 16384 或 1048576 不会被百万窗口放大或覆盖。
- `models.ts:53–60` 创建新的运行记录并克隆原 public snapshot；未写回 model 输入、未增加仓库保存调用。预算补全不改变 modelId、端点、id、authRevision 或 Key；snapshotForRecord 继续返回保存配置的独立副本。
- 修复没有修改上下文保护、工具审批、目录授权、版本校验或回合快照解析。专项仍断言明确小容量触发原 ContextBudgetError。

## 独立执行证据

本审核独立运行 `node --import tsx --test tests/unit/creation-context.test.ts`。普通沙箱首次阻止 Node 派生进程（spawn EPERM），不是测试断言失败；允许隔离测试运行所需的子进程后同一命令退出码 0：5 项通过、0 项失败、0 项跳过。

通过项目覆盖：内置精确容量；受控认证目录缺省容量与供应商明确容量优先；两个旧零配置的官方根地址、`/v1`、默认443端口及输入/快照保持不变；未知型号、其他供应商、错误协议/类别和代理等负边界；真实仙侠四类模板、真实默认提示及工具 schemas 的新预算通过和明确小窗口仍阻断。受控目录没有调用真实供应商；测试未读取真实配置、作品或密钥。

主代理报告的修复前失败结果及其他目录测试 25/25 不属于本审核独立重跑范围，应由主代理对应命令证据另行保留。

## 非阻塞测试保真建议

`creation-context.test.ts:71` 固定 toolTokens=18400 对应百万窗口路由的 16000 工具预算加 2400 步骤空间；原 16000 窗口路由实际为 6400+2400=8800。建议按 modelRecord.contextWindow 使用与路由相同的预算公式，这样修复前失败更直接对应旧首发路径。现有用例仍证明新配置保留原保护且预算通过，但不能用其固定预留独立重现实际 Flash 截图条件。

## 完成验收仍需证据

CC06–09 继续要求真实 Windows Electron 从仙侠向导到正文采用保存与关闭重开，记录客户端选择、冻结 textModelId、实际执行公开型号及预算。当前明确容量 Flash 首发错误如复现，应另补根因、失败用例和修复；此容量代码审核不得替代整项任务验收。
