# 文生图供应商列表：测试用例

日期：2026-10-13（Asia/Shanghai）。技术方案已经独立子代理审核通过。

| ID | 场景 | 预期与证据 |
| --- | --- | --- |
| IP-01 | 共享 IMAGE 预设、设置和引导新增 | 完整列表严格为 bytedance/火山引擎、openai/OpenAI，排除其它及 custom；默认火山引擎，协议和方舟端点不变 |
| IP-02 | TEXT 预设 | 原十二家及自定义、顺序不变，bytedance 名称为火山引擎 |
| IP-03 | 真实 ProviderLogo | bytedance/volcengine 的 provider variant 渲染本地 volcengine.svg、alt 火山引擎；模型 variant 仍用既有模型家族资产；SVG 指纹与固定版本包清单匹配、无外部依赖 |
| IP-04 | 实际 React/Base UI 供应商菜单 | 两家完整可选项、搜索排除 Google/自定义；鼠标和键盘切换、单选；切换供应商清空 Key/型号，无自动保存 |
| IP-05 | 旧 IMAGE 预设及 custom 编辑 | 收起显示真实当前名称/图标，列表仍严格两家；取消不提交，原供应商留空 Key 手动保存保留 id/endpoint/modelId；切换至允许供应商后旧 Key/型号清空；不删除已有记录 |
| IP-06 | 通用 selectedOption | 仅 id 等于 value 时用于当前展示，菜单 options 优先、不把旧当前值加入 items；不匹配则仍占位；原 disabled/搜索/单选用例保持 |
| IP-07 | 实际 Windows Electron | 生产静态 React，paper/ink 两主题设置新增和首次引导 IMAGE 菜单只有两家；两图标从 xaanink:// 本地成功加载、截屏；新增场景零模型/Key。旧配置场景仅在隔离目录注入 Google/custom 合成记录，用真实 OS 加密公开测试凭据，实际 UI 切换后取消、原供应商留空 Key 保存，核对真实 state.json 及关闭重开。无真实 Key 或供应商调用；renderer error/HTTP 观测从 firstWindow 后开始并覆盖离线 reload，主进程无 listener 快照；不宣称启动全程网络审计 |

TDD：先新增/更新专项 unit、真实 React browser 用例和 Windows 验证脚本，旧实现应在 IP-01/IP-03/IP-04 的有效行为断言失败，再修改源码；红绿使用相同断言。旧 ONB 菜单预期及 smoke-byok 按本次明确替代的需求更新；其它断言保留。

code review 后执行 UI/desktop 构建与类型检查、完整当前 unit/integration 和 browser 文件；失败与既有基线分别报告，不将 fixture、未运行、macOS 或安装包计作通过。Windows 验证脚本仅检查本轮实际界面，不把供应商调用、真实密钥授权或其它业务全组验收宣称通过。证据绑定源码/构建指纹并清理隔离目录。
