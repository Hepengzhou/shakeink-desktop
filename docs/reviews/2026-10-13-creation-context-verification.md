# 小说创作向导上下文修复测试结果

官方 DeepSeek 零容量配置的上下文缺陷已通过专项测试和独立代码审核。当前仍未满足用户的完整验收标准：明确容量 Flash 的截图错误尚未实际复现，真实供应商创作到正文尚未通过，全量核心测试仍有失败和取消。

## 已完成验证

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| 修复前专项 | 5项中1通过、4失败；含截图同文案的CONTEXT_SAFETY_BUDGET | 主代理命令结果，creation-context.test.ts原代码运行 |
| 修复后专项与原目录回归 | 25通过，0失败、取消或跳过 | ../evidence/creation-context/scoped.tap |
| 独立容量专项 | 5通过 | creation-context-code-review.md |
| 完整组件回归 | 360通过，0失败、取消或跳过 | ../evidence/creation-context/full-browser.tap |
| TypeScript | 通过 | npm run typecheck，Node24.19.0 |
| 正式开发构建 | Next静态UI与Electron主进程、preload、服务构建通过 | npm run build，Node24.19.0 |
| 全量单元与集成 | 1951项：1891通过、40失败、18取消、2跳过 | ../evidence/creation-context/full-core-output.txt |
| 独立串行复核9个集成文件 | 34项：32通过、1失败、1取消；退出码1 | ../evidence/creation-context/integration-serial-rerun.tap及对应JSON |

专项使用真实向导拼接、固定系统提示、97个真实工具定义及原上下文管理/安全校验函数。目录响应夹具属于受控单元验证，不是供应商端点通过。组件测试同样使用受控接口，不替代真实模型创作。

全量首次运行期间也执行了构建与类型检查。独立对比前轮 `chat-empty-state/core-full-final.tap`：38个同名既有失败与1个既有超时未变；本轮另有17个新超时取消及2个启动计时断言失败，另有2个旧失败本轮通过。串行复核让19个新增问题中的18个通过，剩余BDC07 legacy仍60秒超时；IPC-01既有响应新增`unavailableWorks`的断言仍失败。计时结果支持运行压力可能影响超时的判断，不能据此认定未通过项目已经修复或把整组计为通过。

既有失败覆盖冷源读取夹具、Windows ESM文件URL、配置快照、抽取组件依赖、文件权限、macOS专属验包在Windows执行、模型对话框及平台路径断言。独立复核JSON保存了新增失败与串行恢复对比；本次没有更改这些测试或扩大到其他业务实现。串行运行使用`--test-force-exit`结束测试完成后的运行器，因此该结果不额外证明没有遗留进程或句柄。

## 实际 Windows Electron 前置检查

隔离临时根中的真实Electron44.6.0/Node24.21.0已成功启动并运行原React界面、本地数据库及主进程密钥保护。主进程safeStorage自行加密解密夹具成功，但当前保存的加密DeepSeek凭据在隔离配置中无法解密。早期目录尝试返回AUTHORIZATION_REVOKED；最后一轮明确在TEST_CREDENTIAL_PROFILE_UNAVAILABLE前置条件停止，未调用创作生成。

此结果只能证明隔离测试的启动和凭据前置问题，不能证明用户原应用的Key失效，也不能证明DeepSeek型号不可用。原用户作品未读取，原用户设置未写入。所有报告只保存公开型号、容量、状态、哈希与布尔值，未保存Key、供应商原始响应或真实创作内容。

`scripts/verify-creation-context.mjs` 已准备从真实仙侠向导选四类模板、发送、审批、逐阶段保存、正文抽卡及采用，并核对候选状态、正文哈希和关闭重开。它可以由应用主进程从私有环境变量 `SHAKEINK_CREATION_TEST_KEY` 接收专用测试凭据；值不进入命令参数、页面、worker或报告。此路径尚无真实凭据执行结果，不能标为通过。

## 剩余验收

- CC06：分别核对向导前/后选择和真实首发冻结型号、预算，并核对重试沿用的任务快照。
- CC07：实际官方/models与指定型号SDK调用。
- CC08和CC09：真实简报、主题、世界、人物、剧情、叙事细纲、正文采用及重开校验。
- CC10：全量失败、取消及适用平台的验收问题仍待解决。当前没有安装包、macOS或完整创作通过声明。
