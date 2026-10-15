# 规划卡片「…」菜单修复 code review 记录

日期：2026-10-16。审核对象：本次修复的实际 git diff（`src/components/content/planning/PlanningWorkspace.tsx` +38/-2，新增 `tests/browser/planning-card-menu.test.ts`）。审核方式：独立子代理阅读 diff 与周边代码，并实际运行测试。

## 结论：通过（无 P0/P1）

- **变更范围**：tracked 改动仅 PlanningWorkspace.tsx；新增测试文件与 201-205 流程文档，无夹带。两处菜单 details 加 `data-card-menu` + onClick；新增一个 useEffect（pointerdown/keydown capture）。
- **正确性**：capture 监听无 preventDefault/stopPropagation；菜单项 button 回调先于 details onClick；Escape 焦点归还条件 `menu.contains(document.activeElement)` 正确；文件内其余 9 处披露 `<details>` 均未误标。
- **回归面逐一排除**：既有 :223-243 编辑器外部关闭监听互不拦截；对话框焦点陷阱（bubble）不冲突；拖拽 stopPropagation/setPointerCapture 与本监听无交集；多实例幂等；卸载清理 capture flag 一致。
- **测试质量**：夹具隔离（route abort + fetch 打桩 + window.desktop 桩 + Monaco 抛错边界）；断言走 aria-label/role/data-event，无哈希类名；CM-09 坐标落在 6px padding 区，稳定。
- **审核员实跑**：`node --import tsx --test --test-timeout=120000 tests/browser/planning-card-menu.test.ts` → pass 10 / fail 0（约 10.5s，本机 chromium-1243）。

## P2 记录项（不阻塞）

- CM-02 钉住 computed z-index `"9"`（planning.module.css:1039-1040 契约），CSS 值变更时需同步。
- 菜单与对话框/拖拽同处活动态时一次 Escape 同关两者（capture+bubble）；正常路径菜单先于对话框关闭，近零概率。
- 覆盖空隙：本组不打开编辑器（Monaco 边界），无「编辑器外部关闭监听不受影响」的直接回归用例与卸载清理断言；代码阅读已确认无碍，可选补强。
- 风格微瑕：onClick 用 `.open = false`，effect 用 `removeAttribute("open")`，功能等价。
