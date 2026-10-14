# 模型目录修复专项验收

日期：2026-10-15（Asia/Shanghai）。本轮只执行 [MC-01～MC-13](03-test-cases.md) 的模型目录专项，没有运行全量测试。生产 UI、模型单选、自定义和手动保存规则保持原批准边界。

## 审核与实现

按调研 → 产品/技术方案 → 专项用例 → 实现 → 测试顺序完成。独立 [方案审核](../reviews/2026-10-15-model-catalog-research-review.md)、[用例审核](05-test-review.md)、[代码审核](06-code-review.md) 均通过。代码审核发现并关闭了挂载弹窗重开仍优先显示旧 live 目录的问题；独立服务专项最终为 12/12。

## 定向执行

使用仓库要求的 bundled Node 24.19.0。实际命令的 `node` 为 `C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`。

| 项目 | 执行/结果 | 证据 |
| --- | --- | --- |
| 未修复红灯 | 7项有效行为失败：缺失内置回补、空目录复活、不可用未移除和四供应商回补；另4项因尚无仓库模块而未能验证行为，单独记为缺功能 | `docs/evidence/model-catalog-fix/unit-red.tap`（实际为Node默认spec报告） |
| 最终专项 | `--import tsx --test --test-reporter=tap --test-name-pattern=MC-`，仅指定 `model-catalog-refresh`、`model-settings`、`builtin-model-catalog`、`byok-catalog`、`data-root` 五文件：29/29，0失败/取消/跳过 | `scoped-accepted.tap` |
| 静态检查 | `tsc --noEmit` 与 `tsc --project tsconfig.foundation.json --noEmit`，均退出0；中途可选桥未缩窄的TS错误已修复，最终构建也执行TS检查 | `typecheck-final.log`、`typecheck-foundation.log` |
| 最终构建 | Next UI生产构建及 `scripts/build-desktop.mjs`，均退出0 | `build-ui-accepted.log`、`build-desktop-accepted.log` |
| Windows实际目标 | 正式编译 React/preload/main/service，实际 IPC 与文件系统，5/5；测试结束清理隔离数据；HTTP监听0、外网请求0，运行期间源码哈希未改变 | `windows-accepted/windows-electron.json` |

表格证据的未限定路径均位于 `docs/evidence/model-catalog-fix/`。沙箱首次启动测试因 spawn EPERM 未执行，随后相同专项获自动审核允许后使用 Node24 实际执行；未把环境启动失败记为产品红灯。

Windows首轮 `windows/` 因账号按钮的实际 aria 名称为“账号菜单：作者”而定位失败，0检查通过。按真实源码改前缀定位后 `windows-02/` 5/5通过；失败目录保留，最终证据另建 `windows-accepted/`，没有覆盖旧失败。

## 覆盖映射

| 用例 | 实际证据 |
| --- | --- |
| MC-01 | 21个保守种子的独立官方来源/日期契约；智谱无已核实种子则为空 |
| MC-02～05 | 所有预设范围替换/空列表、四处回补移除、协议分页/认证/网络/格式/取消、能力未知不猜测、明确不可用及已下线腾讯即使live误回传也过滤 |
| MC-06～08 | 实际文件原子落盘、新仓库恢复、scope/尾斜线/custom隔离、字节无Key或grant、反序提交保护、写失败与损坏读盘、普通/订阅认证差异及重启去grant |
| MC-09～11 | 实际React组件受控hooks/IPC的选择清空、禁止旧记录保存/测试、缓存加载及反序、挂载重开、更换Key、失败保持目录、取消不保存、custom手填 |
| MC-12 | 实际Windows Electron的官方GET `/models`公开协议夹具经正式IPC刷新；目录落盘；应用关闭/重启后无Key离线只显示更新项；空目录再重启不回种子；旧记录缺失不可保存 |
| MC-13 | 隔离根真实文件系统迁移，目录文件纳入所有权清单，目标根新仓库仍恢复空快照而不复活种子 |

## 实际界面

- [无Key离线重启后仅显示刷新保留项](../evidence/model-catalog-fix/windows-accepted/offline-restarted.png)
- [完整空目录关闭重启后仍为空](../evidence/model-catalog-fix/windows-accepted/empty-restarted.png)
- [旧记录的缺失型号不回插且保存被阻止](../evidence/model-catalog-fix/windows-accepted/removed-old-record.png)

## 验证边界

官方来源由实际网页调研及独立审核确认；供应商目录响应测试采用公开协议夹具，不能宣称真实账户或付费调用通过。Windows验证是实际开发Electron和正式编译产物，不代表已更新安装包、macOS或全仓库业务验收。未读取用户真实数据/Key，没有新增付费请求、默认模型、平台后备或HTTP监听。
