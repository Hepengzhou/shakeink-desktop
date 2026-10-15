# 配置目录删除自愈方案与用例独立审核

日期：2026-10-15。审核对象：194 调研、195 产品、196 用例。审核方式：独立子代理只读对照真实源码与既有测试，结论附文件:行号证据。结论：**需修订后批准**——2 个 P0、9 个 P1、5 个 P2，全部修订已落回 194/195/196，可进入 TDD。

## 审核确认成立的事实

- 现行行为表与代码一致：删 inbox/catalog.json → worker 初始化失败 → `failedRootCode` → 受限恢复窗口（`workspaces.ts:116-118`、`index.ts:826-834`）；删 drafts.json 懒读不阻塞；标记有效时分类层不查内容完备性（`startup-recovery.ts:88-91`）。
- 设计骨架可行：分类层扩展 content 修复、临时根复用 `launch()` 兜底、复用 `executeStartupReset`、index.ts AST 提取测试机制兼容（SR-U-104b~110 路由期望改 reset-offer 列表完整、同型文件逐一排除）。

## 分级发现与处置

| 级别 | 发现 | 处置 |
| --- | --- | --- |
| P0-1 | **inboxReady 门**：仅重建目录对真实根（inboxReady:true）修不好——worker `workspaces.ts:319-321` 拒绝自动重建；且用例集（stub launch + seed 标记 inboxReady:false）不会暴露 | 194/195/196 全部补充：content 修复必须隔离原标记并原子改写 `inboxReady:false`（保留 id/app/phase），worker 自建库并回写 true；C07 演示须先完整启动（adopt+inboxReady:true）再破坏 |
| P0-2 | **可重建标记+内容损坏归类未决策**，与 reset 崩溃不变量（`startup-recovery.ts:170-172`）及 SR-U-14/14b/15/15b、SR-U-28、SR-U-64 冲突 | 决策落地：有有效指针→content（SR-U-14/15 翻转）；无指针→坚守 dialog（SR-U-28）；reset 崩溃残留按「能修则修」自愈（SR-U-64 翻转+注释更新） |
| P1-1 | `startupSelectionError` 未列入临时改写清单（`index.ts:223`） | 兜底闭包置 null，已写明 |
| P1-2 | 临时根位置/生命周期未定义 | os.tmpdir + 残留由 OS 清理，已写明 |
| P1-3 | `executeStartupReset` 失败 UX 缺失 | RESET_FAILED → 错误框+exit(1)（原文件保留），已写入 195/196 C06 |
| P1-4 | 194 表格 inbox 与 inbox/database 应拆行；行号偏差 | 已修订 |
| P1-5 | integration SR-I-07 处置未交代 | 列入改动清单：改写为 content 自愈断言并 scoped 执行 |
| P1-6 | symlink/异形内容的处理未说明 | 视为损坏隔离重建，行为放松已明示 |
| P1-7 | C06 接缝（index.ts 内部函数无法 stub） | 改为独立模块 `config-reset-offer.ts`（不依赖 electron，host 注入），index.ts 闭包实现 host |
| P2 组 | failedRootCode 二次 launch 的 protocol 重复注册守卫注释；relaunch 方式对齐先例注明有意；onboarding 背景说明；关窗 dismiss；补充用例建议 | 均已落文档/实现 |

## 总体结论

194 现行行为分析属实，195/196 骨架与代码高度吻合；P0 修订（inboxReady 设计 + 分类决策）与 P1 各项落实后**批准进入 TDD**。
