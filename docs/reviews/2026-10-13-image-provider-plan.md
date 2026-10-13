# 文生图供应商列表：技术方案

日期：2026-10-13（Asia/Shanghai）。用户要求把「字节跳动」供应商名称及图标改为「火山引擎」，文生图供应商菜单只留火山引擎和 OpenAI。本次最新要求覆盖旧设计中的八家文生图及自定义菜单范围，无须重新批准 UI。

源码依据：`desktop/shared/model-catalog.ts` 的 `presetsFor` 被真实 `ModelConfigurationDialog` 同时用于设置和首次引导；`src/components/chat/provider-logos.tsx` 的 bytedance 品牌及 volcengine 别名仍映射字节跳动资产；`ModelSettings.tsx` 从共享预设读取供应商名称。

实施：共享预设 bytedance 显示名改为火山引擎；IMAGE 菜单显式仅筛选 bytedance、openai，沿用现有顺序（火山引擎在先）。TEXT 保持全部现有供应商及自定义，只同步火山名称。保留 bytedance 内部 ID、协议、端点、型号目录和授权逻辑，避免破坏已保存配置，不删除已有其它供应商记录。

供应商图标使用本地 `public/brands/providers/volcengine.svg`，来源与指纹记录于品牌资产清单；优先火山官网可见图形或现有 MIT 图标包的同品牌资产，保留可见路径与颜色，不使用生成图。bytedance 和 volcengine 两个输入均指向火山供应商资产；模型家族图标保持已有独立资产。

旧 IMAGE 配置若属于已移出菜单的供应商，在收起控件仍显示当前供应商名/图标、允许保留原配置编辑，展开菜单仍只有两家。通过可选的 `selectedOption` 展示当前值（仅匹配当前 ID），不把它加入可选列表；供应商变更依旧清空旧 Key 和型号。连接测试结果名称从完整预设读取，避免旧供应商显示内部 ID。

按 AGENTS.md 顺序执行独立方案审核、用例审核、有效 TDD 红灯、实现与独立 code review、全量当前 unit/integration 和 browser 用例、真实 Windows Electron 双主题专项。专项覆盖设置/首次引导、两家完整菜单和图标、本地离线加载、旧配置编辑；不调用真实供应商，不写入真实 Key/数据。构建与开发 Electron 验证不声明 macOS 或安装包已验证。台账仅增加本项，保留既有修改及失败证据。
