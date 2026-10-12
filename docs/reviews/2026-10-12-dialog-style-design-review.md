# 对话框 HTML 设计独立审核（2026-10-12）

审核文件为 `design/dialog-style/index.html`、`preview.css`、`viewer.js`、`capture-preview.mjs` 与 `docs/reviews/2026-10-12-dialog-style-research.md`。交付前复核另获授权只读 `preview-observations.json`、`verify-preview.mjs`、`html-checks.json` 和已生成 PNG：读取 24 条采集记录、核对 viewer 引用的 26 张已生成图片、比较菜单图片 SHA256、查看两个拟议截图，并审核主代理生成的 36 组 HTML 切换检查证据。本代理未运行截图脚本、产品测试或构建，未修改产品；唯一写入是本审核记录。

## 第二版 10% 遮罩复核（本轮，待用户审核）

用户要求背景再稍暗一点、不要太多。本轮只审查设计稿从 8% 改到 10% 的相关差异；不实施产品，不扩大测试范围。本代理只读新版源码、24 条采集记录与 36 组 HTML 检查结果，查看两张已生成拟议 PNG，并更新本文件；未运行截图脚本、HTML 检查、产品测试或全量测试。

**复核结论：第二版材料与本轮要求一致，可继续交用户审核。** 仅将应用自绘对话层遮罩增加 2 个百分点；背景仍无虚化，阴影数值与面板位置/尺寸保持首版结果，定位弹出框仍排除。用户尚未批准本版，产品实现与专项产品测试仍未开始。

| 核对项 | 第二版实际证据 |
| --- | --- |
| HTML 与示意遮罩 | `index.html:12,60` 明确第二版、黑色 10%、比首版增加 2 个百分点及手工第二层局部最多 19%；`preview.css:35` 为 `rgba(0,0,0,.10)`，两种 backdrop-filter 均 none |
| 真实组件临时 CSS | `capture-preview.mjs:27,29` 的共享与手工对话层遮罩都为 `.10`；没有扩大选择器到菜单或通用 Popup |
| 新版采集标识 | `preview-observations.json` 与 `html-checks.json` 均为 `revision:"v2"`、`overlayOpacity:0.1`，避免把首版结果当新版证据 |
| 实际遮罩计算值 | 24 条采集记录中的非菜单 proposed 均为 `rgba(0, 0, 0, 0.1)`、`backdrop:"none"`；菜单无对话遮罩。两主题向导详情各有两个 10% 背板 |
| 两层加深计算 | `1-(1-.10)^2=19%`；首版为 `1-(1-.08)^2=15.36%`。这是手工局部第二层的合成值，没有新增全屏第二层 |
| 阴影不变 | `preview.css:32–33` 与 `capture-preview.mjs:25–26` 的纸色/黑色阴影数值未变。将本轮记录与开始前保留的 24 条首版记录逐项比较，实体面板 `boxShadow` 全部相同；纸色第二段阴影中的 `.08` 正确保留，没有误改成 `.10` |
| 布局与图片尺寸 | 同一逐项比较中，面板 rect、PNG 尺寸全部相同；仍为 CSS viewport 1440×900、DPR 1.5、实际 PNG 2160×1350 |
| 产品相关文件边界 | 采集记录追踪的 `ui/dialog.tsx`、`desktop.css`、`planning.module.css` 与 `dist/main/index.cjs` 四项 sourceHashes 与首版相同；本轮为设计 CSS 注入，没有以产品实施结果交付 |
| 菜单排除项 | 本轮 paper current/proposed SHA256 同为 `1549898B07479BFCBFCD04A4256AB59DDD7CC12E6F52E268F1DA034F5F61F20A`；ink 同为 `0211549B1C8E4E272304A0F4ABDBD5982B2F0F2F3337E3F69465E6B5885278DD`。两主题各自对照图片完全相同，不新增遮罩 |
| 新版审核页检查 | 主代理实际执行的检查记录为 24 条采集数据验证、36 组主题/场景/对照切换，菜单图片一致，窄页无溢出、键盘切换成功，页面错误/失败请求/HTTP 请求为空；这些仅是设计页检查，不是产品验收 |

本代理查看新版 `paper-settings-proposed.png` 与 `ink-wizard-detail-proposed.png`：背景字形、边缘保持清楚，轻遮罩与框周边界仍可见。网络证据仍限于脚本记录的 renderer 观察区间，不能抵作产品或 main/worker 的离线启动验收。

## 首版 8% 审核结论（历史保留）

以下记录来自首版 8% 的当时文件与采集结果。当前 `design/dialog-style` 的同名截图和 JSON 已更新为第二版 10%；历史记录不代表当前拟议遮罩值，也不表示用户曾批准首版。

设计方向与用户要求相符：拟议方案明确取消背景虚化，单层使用黑色 8% 遮罩，宣纸/玄墨使用各自轻阴影；覆盖共享业务框、嵌套编辑、规划自绘表单/侧详情、向导详情与试验场配置层；菜单、候选、工具提示、伏笔浮窗、搜索和导航展开层明确排除。

设计预览与产品实现的边界清楚：真实组件截图与纯样式示意分开标注，临时 CSS 只注入隔离 Electron 进程；HTML 无产品桥接、持久化或网络资源。文档正确保留了“用户审核后实现”的阶段门和“仅当前目标相关测试、禁止全量测试”的新约束。此审核不替代用户的 UI 审核。

交付前复核确认首轮意见均已有对应修正与证据，材料可交用户审核。未发现阻止本设计材料交付的剩余 CSS、逻辑或事实错误。这里的“可交付”不表示产品实现、产品测试通过或用户批准。

## 首轮意见的关闭证据

1. **原生边界分类文案：已关闭。** 调研原生系统对话框行现仅列实际 `window.confirm`、`dialog.showMessageBox/showErrorBox` 和系统文件/目录选择器，新增“独立启动恢复窗口内的应用 React 页面不属于系统绘制对话框，不能混为一类”。HTML 的系统边界仍明确是拟保留系统样式、需随 UI 稿确认，未提前宣称用户批准。

2. **“当前效果”虚化参数：已关闭。** 已删除普通确认的近似绘制及 `blur(2px)`；场景改为真实“恢复默认快捷键”确认的 current/proposed 截图。`preview-observations.json` 中两主题 confirm、settings、profile、wizard 的 current 通用遮罩实际值均为 `blur(4px)`；proposed 为 `none`、`rgba(0, 0, 0, 0.08)`。调研也记录了真实 4px 值，未再以 xs 名称估算。

3. **截图尺寸匹配：已关闭。** 采集脚本现使用 sharp 的实际 PNG metadata，核对 `width/height = round(viewport × dpr)` 并要求 CSS viewport 为 1440×900。24 条记录均是 CSS viewport 1440×900、DPR 1.5、实际 PNG 2160×1350；HTML 以 1440×900 展示，比例一致。实际查看的 `paper-settings-proposed.png`、`ink-wizard-detail-proposed.png` 也由图片工具确认原始像素为 2160×1350。不能把实际 PNG 写成 1440×900 像素。

4. **手工第二层和局部配置的可见实例：已关闭。** 新增真实“向导内模板详情”两主题 current/proposed 截图；current 手工背板为 paper 45%、ink 60%，proposed 两个背板均为 8%、none，并有 2 个实体面板阴影。HTML 另增“试验场局部配置 · 样式示意”，`#live` 仅覆盖右业务区（left 930px、top 44px、510×856），current 20%、proposed 8%，未把此局部场景画成全屏遮罩。示意已与真实截图分开标注。

5. **采集空列表可能误通过：已关闭。** 脚本新增场景对应实体面板数量断言和遮罩存在断言。实际记录中 settings/wizard 为 1 个面板，profile/confirm/wizard-detail 为 2 个；wizard-detail 为 2 个遮罩，其他实际对话场景为 1 个。菜单排除项两模式均无 dialog/overlay。

6. **菜单排除项效果：已有直接证据。** 两主题菜单 current/proposed PNG 的 SHA256 分别完全相同：paper 为 `1D33D8D8BAF84B7122E928A207F316950B46BA34E9C8DD2D32092B33E98BFA50`，ink 为 `0211549B1C8E4E272304A0F4ABDBD5982B2F0F2F3337E3F69465E6B5885278DD`。这证明此审核预览未改变账户菜单像素；其他排除项的最终产品测试仍属后续阶段。

## 静态逻辑与隔离检查

- `viewer.js:6–22` 将拟议/当前、两主题和不同场景切换限制于本地 DOM；只有场景选择与本地图片路径，没有产品 IPC 或保存动作。示意按钮没有绑定数据写入。
- `viewer.js:6–13` 现仅对 planning/drawer/scenario 显示自绘层；confirm 已与其他真实场景一样使用实际截图。未对菜单额外添加 `.shade`。
- `capture-preview.mjs` 临时注入命中 `data-slot="dialog-overlay"/"dialog-content"` 以及临时标注的向导手工详情层，没有修改全局 `--shadow-2`、通用 `[role="dialog"]` 或所有 Popup。设置已有重阴影由同一内容选择器覆盖，既有 ring 保留为细轮廓。
- 采集脚本使用临时数据根、初始化独立工作区、设置无模型并核实 bootstrap 根；未读入真实用户资料或 Key。现有 JSON 明确 `isolatedData:true`、`models:0`、`pageErrors:[]`、`rendererHttpRequests:[]`。
- HTTP 记录器和离线设置仍在 firstWindow 后生效；脚本及已补录的 JSON `networkObservationScope` 元数据均正确限定为 firstWindow 返回到采集结束、仅 renderer、不是 main/worker 启动网络验收。此补录是观察范围说明，不代表新增采集。空 HTTP 列表不能抵作产品离线启动验收。
- viewer 引用的 26 张文件为 24 张真实场景 current/proposed 图及 2 张工作台背景图。两幅已查看的拟议图背景文字/边缘保持清楚，实体框轻阴影与既有边界可见。
- 主代理的 `verify-preview.mjs` 只检查本地 HTML 审核产物与既有采集记录，未运行产品测试；`html-checks.json` 记录 24 条采集数据复核、两主题×9 场景×2 对照共 36 组切换/图片解码，拟议自绘遮罩为 8%/none、面板轻阴影，单一主题/对照按钮 pressed 状态，菜单字节一致、560px 页宽无溢出、Enter 切换按钮成功，页面错误/失败请求/HTTP 请求均为空。本代理只读审核这些命令结果，未重跑检查。

## 引用位置数量复核

调研 `:16` 原文为“源码共有 55 个 `<DialogContent>` 使用位置”，并未宣称是 55 个业务用例。上轮独立源码审核执行的 `rg -n '<DialogContent' src/components --glob '*.tsx' | Measure-Object -Line` 得到 55 行，且范围清单明确一个源码位置可对应多个状态。该事实表述正确；后续测试覆盖须按真实分支，不得用 55 引用位置直接抵作 55 用例通过。

## 首版阶段状态（历史保留）

本次范围与设计独立审核已完成，原意见已按实际文件和新增记录关闭。本代理未执行产品测试、未运行全量测试、未实施样式、未重跑截图。规划与试验场配置仍是样式示意，不是业务操作或产品验收；原生边界仍是设计提案；用户尚未批准 HTML，后续技术方案/用例/TDD 实施及专项测试须等 UI 审核通过。
