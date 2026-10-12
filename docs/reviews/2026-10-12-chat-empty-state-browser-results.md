# AI 对话首屏完整组件浏览器验证

日期：2026-10-12（Asia/Shanghai）。执行代理：production_audit。

本文件保留首次19项组件运行及当时的源文件指纹。后续新增CES-06b、修复发送清理并提高夹具环境预算后的最终20项组件已包含于60/60专项结果，见 [最终验证](./2026-10-12-chat-empty-state-verification.md) 和 `docs/evidence/chat-empty-state/final-scoped-budgeted.tap`；下方19项和旧hook哈希不作为最新生产版本的最终结果。

**最终结果：19 条通过，0 失败，0 跳过，退出码 0。** 本记录证明完整真实 React 组件在受控浏览器夹具中的契约，不代替正式 Electron、本地数据库、原生窗口、macOS 或供应商生成验收。

## 实际运行

```powershell
$env:XAANINK_TEST_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
node --import tsx --test --test-concurrency=1 tests/browser/chat-empty-state.test.ts 2>&1 | Tee-Object -FilePath docs/reviews/2026-10-12-chat-empty-state-browser-green.tap
exit $LASTEXITCODE
```

实际 Node：`v20.12.2`。Chrome 可执行文件产品版本：`154.0.8037.98`。最终 TAP 时长：`51286.5351ms`。原始结果：[browser-green.tap](./2026-10-12-chat-empty-state-browser-green.tap)。

夹具直接导入完整 `ChatPanel`、原 `CreateNovelDialog`、真实 `useAgentChat`、zustand stores、React Query、composer helpers、向导分类/过滤/拼贴、命令目标和实际 ThemeProvider。没有提取本轮回调、替换目标组件或导入 design 原型代码。esbuild 输出真实依赖 ESM、CSS及字体；公共 PNG 请求从 `public` 读取原文件字节，不用占位图回退。`window.desktop` 仅声明实际剪贴板测试所需的两个方法，没有任意空函数 Proxy。HTTP 查询/发送/建书响应是明确的合成夹具，路由只在浏览器拦截，不建立 HTTP 监听服务。

初始夹具的字体/CSS loader、Next 编译环境、缺少选卡 GET 路由和过短操作等待已修正，未当作产品 RED。生产 TDD 的实施前 RED 由主代理的纯函数测试单独记录；本浏览器文件的最终结果是 GREEN，不能倒称本文件已在生产实施前完成有效业务 RED。

## 可观察结果

| 用例 | 已证明的组件行为 |
| --- | --- |
| CES-01a/01b | 首次恢复 `queuePaused=true` 且无队列时七入口可见；恢复、建书、恢复/真实写存储失败通知、待确认请求、待批准计划、实际队列、待答问题、生成/执行恢复和当前关联选卡阻断欢迎。原提示/问答/选卡槽仍可见，无关作品选卡不阻断。仅准备书名仍可编辑草稿、看到真实待创建关联行和欢迎入口。 |
| CES-04 × 3 | 角色/世界观/场景完整批准提示词追加两个换行；完整重复不再追加，只聚焦。原 editor 与既有 chip 是同一 DOM 节点，序列化及 store 一致；真实 Chromium Ctrl+Z/Ctrl+Y 撤销/重做一次追加，不发送。 |
| CES-04b | 合成 compositionstart/compositionend 事件能验证 React 组合状态下快捷入口保护及结束后恢复；此项不宣称操作系统输入法真实验收。 |
| CES-02 × 3 | 仙侠/历史/科幻用真实向导预选男频、长篇及批准四组标签；编辑不因父状态重渲染而复位；取消不改草稿；普通创建及不传 preset 的原向导重新打开不会串预选。 |
| CES-03 | 非空草稿须两次确认，改变筛选撤销覆盖确认。最后准备新的 null 作品关联会话，书名、请求身份和准确位置保存；没有 POST 建书或聊天；原 editor 实际获得焦点。 |
| CES-05a/05b | response 默认 ID 不自动选中；未选及删除模型不能发送或提前建书，草稿/待创建标题/稳定请求 ID 保留。无模型自动队列不消费队首，仅列入模型目录仍不发送，有效选择后原顺序发送。 |
| CES-05d/05e | 无模型的外部 improve 动作完整进入暂停队列，原问题、选卡、草稿动作及草稿不受副作用影响。实际点击原 CandidateActionPanel 的“继续改进这张”同样保留选择及槽位、完整固定消息进入暂停队列，零 POST。 |
| CES-05c | 继承默认仍为 `modelChoiceExplicit=false`，首发请求省略 modelId，让原服务端负责快照。向导确认不提前建书；有效发送先建书再按正确新作品 ID 发聊天；首消息进入和重置新草稿时 editor 节点保持。此建书/聊天成功响应为夹具，不宣称本地数据库或供应商成功。 |
| CES-06 | 普通加载失败持续显示错误且无伪欢迎；原重试成功后清除；新草稿切换后的旧请求晚失败不能污染新 draftId/草稿/错误状态。 |
| CES-07/08 | 真实鼠标悬停右图展开至 12 并保持，移开收回，中途换向可继续；小图标 src 不变且没有帧属性。真实媒体查询减少动态及打开原模态均清零/暂停。 |
| CES-09 × 2 | 真实 ThemeProvider 的纸/墨 class、原本地图像实际解码，纸主题暖灰黄/墨灰度滤镜与半透明可观察；宽 1000/560/480/479/320 下卡组与 composer 等宽且 ≤800，四卡等高 114px、有副标题，480 分栏边界正确；短视口七卡逐个完整滚动可达并接受鼠标命中，输入框持续可见。 |

未在本文件实测：实际 Electron 原生窗口 blur/隐藏与 `document.hidden`、操作系统输入法组合、完整本地 API/数据库落库、真实供应商调用、macOS。主代理按 CES-10/11 记录回归与 Windows 原生验收，不能用本结果替代。

## 最终文件指纹

以下 SHA-256 在最终运行完成后读取，供主代理组合验收核对。

| 文件 | SHA-256 |
| --- | --- |
| `tests/browser/chat-empty-state.test.ts` | `2d0d7f8edf8a3d5d3a663360ea7a1273b7196744379601c548d22a937b7f79f1` |
| `browser-green.tap` | `0e8918ca2901250bcde337fcbe38b776df7366b2230a77d2f84e740476d51bea` |
| `src/components/layout/ChatPanel.tsx` | `9578b269b1ef6d37964b2de8473466335949ed878f9a027f35c25df949de8d2a` |
| `src/components/layout/CreateNovelDialog.tsx` | `19ba723e811e4d3bc28692ed31c771dac421fd2bd44a15b0a6cc58275a7aabb0` |
| `src/components/chat/CandidateActionPanel.tsx` | `02cf57c9fd1ef3d470b62e36c9a3aa2354b05579b3ed1e408c7acc33575dfe96` |
| `src/components/chat/use-agent-chat.ts` | `d8d4298c450d163810772e8e21149474690636a26e98944c79a73f21f07c3512` |
| `src/components/chat/ModelPicker.tsx` | `f366a21637c11835c9cfa11d0eadc17cc2aa075cd984ce65b6a4dc6b861f271f` |
| `src/components/chat/use-chat-models.ts` | `0c9792d9258227d68ef1054fdd7e053ffdcfe99e6c28bdacf89a6d4d60ee663a` |
| `src/lib/chat-empty-state.ts` | `b7a3fd374c57fd202395393556f2bfbd40d6cdc6164ef97c6156e80300f80a6d` |
| `src/lib/creation-wizard/presets.ts` | `06b6367a07f22cbdac6fcfe0ee3d5ec775e824222bce0b86bdab35adda0d7186` |
| `src/components/chat/ChatEmptyState.tsx` | `3d5d3f52ba2643c1ef991aced5cc22eb6750f831e842be43ce23bd2fe8de03c6` |
| `src/components/chat/use-chat-empty-motion.ts` | `a03000d6d59214c0a486429915b82e2a9fa7c36e477a6a7f8749fde7dabfac88` |
| `src/components/chat/chat-empty-motion.ts` | `301aa2615173cfd67a6e0b74d0b1069ec42246b7a7438750cf2be59d2ebf4ca6` |
| `src/components/chat/chat-empty-state.css` | `4e4994a80f20c2a2c69a6108610cc380c0ffe0bbb5e6f0aaa87baefa8ce261d3` |
| `src/components/chat/chat-empty-dock.css` | `161e97d21318928256a494e75bcd4b01982288417b3c96bf75c5b0a592b01257` |

本代理仅新增浏览器测试与独立审核/运行记录，未修改生产代码。
