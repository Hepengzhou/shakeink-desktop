# 对话框第二版实施与专项验证

日期：2026-10-12（Asia/Shanghai）。依据：用户已明确批准第二版 HTML 并授权继续。最终实现为 10% 黑色遮罩、无背景虚化、两主题轻阴影；只修改批准范围内五个产品文件，保留原有 composer 未提交变更。

## 实施结果

共享 `ui/dialog.tsx` 继续服务全部 55 个 DialogContent 源码使用位置，移除背景 blur 并接入专属 overlay/surface 类；`desktop.css` 增加对话专属令牌与组合阴影，保留原 Tailwind ring/inset 层，删除设置框旧重影。未修改全局 shadow-1/2/3 或通用 role=dialog/Popup 样式。

规划模态 CSS 的居中表单、居中详情和侧详情统一使用同一遮罩/阴影，移除后置 foreground 35% 背景和旧侧影。向导内部详情改为局部10%遮罩，局部两层合成19%；试验场只将 active 弹出配置卡片接入轻影，draft 内联 ConfigForm 保留原 shadow-2。

Portal、原组件、尺寸、圆角、布局、动画、保存及关闭/焦点代码均保持。菜单、Select/Combobox、Tooltip、伏笔定位浮窗、内联卡片和导航展开层排除。已批准的系统原生对话框边界保留系统样式，没有把 renderer CSS 成功声明为原生系统样式统一。

## 顺序与独立审核

调研：[research](2026-10-12-dialog-style-research.md) → [第二版 HTML](../../design/dialog-style/index.html)，用户审核通过 → [技术方案](2026-10-12-dialog-style-plan.md)及[独立方案审核](2026-10-12-dialog-style-plan-review.md) → [专项用例](2026-10-12-dialog-style-test-cases.md)及[独立用例审核](2026-10-12-dialog-style-test-review.md) → 新用例红灯 → 五文件实现 → 当前产品专项绿色验证及[独立 code review](2026-10-12-dialog-style-code-review.md)。设计预览与产品验证分别记录，不互相替代。

## 执行结果

| 检查 | 真实结果 | 记录 |
| --- | --- | --- |
| 新增浏览器样式/必要交互 | 25/25 通过，0失败/跳过/取消 | `docs/evidence/dialog-style/green.tap` |
| 现有关闭/背景命令阻断相关回归 | 7/7 通过，0失败/跳过/取消 | `docs/evidence/dialog-style/modal-commands-green.tap` |
| UI 编译与随构建 TypeScript | 通过；不计作测试用例 | `docs/evidence/dialog-style/build-ui.txt` |
| 真实 Windows 开发 Electron | 两主题24实际场景、18相关交互检查通过 | `docs/evidence/dialog-style/windows-electron.json` |
| 源码/产物绑定 | 最终记录中五产品文件与两脚本 SHA256 和当前文件一致 | `windows-electron.json.sourceHashes`，主代理另行比对命令 |
| 最终独立 code review | 通过，无剩余阻断；复核32项记录、真实截图与18项来源/编译哈希 | `docs/reviews/2026-10-12-dialog-style-code-review.md` |

只运行两个指定浏览器测试文件和一个指定真实 Electron 脚本，没有运行 `npm test`、全量单元/集成/浏览器测试或全量回归。UI build 用于提供新编译产物，不发布、不重新打安装包。

浏览器新测试使用实际当前产品 CSS、共享 Base UI 组件、原创作向导、ScenarioPanel/ChatView/ConfigForm、Menu/Select/Tooltip/ModelChoiceSelect；业务 GET 数据为隔离内存夹具。设置布局、规划模块及伏笔浮窗是明确的 CSS probe，未记为本地数据库或实际业务验收。真实 Electron 使用独立 Workspaces/Prisma 本地数据库夹具，不使用 mock API 或临时拟议 CSS，不含用户数据、模型或 Key。

TDD 原始 `red.tap` 的旧产品完整运行是25项：4通过、21失败。18项是有效目标样式红灯（共享虚化/缺少轻影、设置重影、规划旧背景、向导深遮罩、试验场旧遮罩）；另3项是测试前提错误（2项透明零影序列化、1项Tab焦点未稳定），随后校正，不把它们算作产品失败。绿色阶段还校正背景 inert 节点查找和宣纸既有 border 基线假设，均未改产品行为。

原有宣纸 `.scpane` 的配置卡片 border 在缺少 chat-line-strong 上下文时为0px；玄墨为既有细边。本轮只保留原值，不新增边框。Windows DPR=1.5 时声明1px边框的计算使用值为0.666667px，真实脚本以实际DPR及同主题 draft ConfigForm 原值对照。中间脚本固定1px假设的失败截图/JSON保留于 `windows-electron-failure.json/windows-failure.png`；最终有效结果是 `windows-electron.json`。

## 真实 Windows 场景

每个主题均实际执行：无模型引导、宽设置、用户嵌套编辑、快捷键恢复确认、向导主框/内部详情、规划表单/时期侧详情/事件侧详情、draft内联配置/active弹出配置、账户菜单，共12类×2主题=24场景。核对计算遮罩、无虚化、准确两段投影及原ring/border；同时验证列明的Tab、Escape、外点和焦点返回契约。

试验场原有局部配置没有 Escape 关闭及焦点 trap，本轮保留该行为；脚本检查 Escape 后仍打开及按钮/外点关闭，不假造新的模态行为通过。引导继续禁止 Escape/外点关闭；向导内部 Escape/外点只关闭详情。

实际运行 Windows Electron44.6.0、DPR1.5、1440×900 CSS视窗、2160×1350截图。主代理和独立验证代理均查看两主题真实截图联系表：

- [宣纸联系表](../evidence/dialog-style/windows-paper-contact-sheet.png)
- [玄墨联系表](../evidence/dialog-style/windows-ink-contact-sheet.png)

最终关闭后 renderer pageerror、console error 和观察到的 HTTP(S) 请求均为0；每个场景的主进程 Node Server 监听快照均为0。网络观察从取得renderer窗口并附加监听开始至关闭结束，只证明该观察区间及快照，不声明主进程/worker启动全生命周期、全部OS端口或供应商网络验收。

## 规划四分支台账及限制

| 真实源码分支 | 样式证据 | Windows 实际UI执行 |
| --- | --- | --- |
| 通用动态表单 | 两主题真实CSS module表单probe通过，token/ring边界已独立审查 | 两主题世界线设置表单通过 |
| period-detail | 两主题420px右侧CSS形态通过 | 两主题实际时期侧详情通过 |
| event-detail | 两主题侧详情CSS形态通过 | 两主题实际事件侧详情通过 |
| 冻结时期居中详情 | 两主题 `.dialog > .detail` 居中CSS probe通过，源码分支共同绑定同一模块入口 | 未执行：正常UI没有找到 kind=period 且冻结ID的可达触发器；冻结条目打开period-detail并禁用“修改时期”。没有注入React状态伪造执行 |

55共享使用位置是源码覆盖清单，不是55个业务用例。冻结居中分支仅证明源码/实际CSS覆盖；不冒称实际组件/业务执行。macOS、物理键盘/输入法、安装包、系统原生框及29类业务完整回归未执行，本轮不申报这些验收。
