# 验证记录：Key 输入自动刷新与失效选择自动替换（2026-10-15）

范围：`docs/model-key-auto-refresh/02-product.md` 规则 1-6。只执行本次目标相关验证；按用户指示不跑全量。

## 单元/集成（真实组件 + 受控 hooks/IPC）

命令：`node --import tsx --test tests/unit/model-settings.test.ts tests/unit/onboarding-editors.test.ts tests/unit/onboarding-retry-integration.test.ts`

结果：76 例，73 过。本轮新增/改写 8 例全部通过：

- KR-01 连续输入防抖合并为一次请求且携带最新 Key；KR-02 挂载/custom/空 Key/回填揭示不触发；KR-03 供应商切换取消挂起刷新、选型号不取消（双向顺序均钉死）；MC-09/KR-04 刷新后自动替换为下一个可用型号并可直接保存；KR-04 查重跳过（同 scope 已添加型号）与展开列表入口单次请求；KR-05 无替代时清空并阻止保存/测试；ONB 引导侧自动刷新 + 替换同步 onDraftChanged + 提示文案。
- 3 个失败（"approved close button…"、"catalog choices replace one draft…"、"IP-01/IP-05…"）在改动前 HEAD 上以相同错误复现（git stash 比对），为既有问题，与本轮无关。

## 浏览器层（系统 Chrome，`SHAKEINK_TEST_CHROMIUM`）

命令：`SHAKEINK_TEST_CHROMIUM=<系统 Chrome> node --import tsx --test tests/browser/image-provider-menu.test.ts`

结果：5/6。"IP-05 legacy google" 在改动前 HEAD 同样失败（既有）；自动刷新的 legacy 供应商守卫使其不产生目录请求。

## 类型检查

`tsc --noEmit` 与 `tsc -p tsconfig.foundation.json --noEmit` 均通过。

## 真实 Windows Electron 验收（KR-07/MC-12）

命令：`node --import tsx scripts/verify-model-catalog-refresh.mjs windows-key-auto-refresh`

结果：**5/5 通过**。证据：`docs/evidence/model-catalog-fix/windows-key-auto-refresh/`（report JSON + 截图）。

- MC-12-seeds-and-live-prune：填入 Key 后**不点按钮**，夹具计数轮询确认自动刷新恰好一次；已选内置种子 deepseek-flash 被 live 目录剔除后自动替换为 deepseek-v4-pro，出现"已替换为下一个可用模型"提示；快照落盘且不含 Key（`live-replaced.png`）。
- MC-12-offline-restart-no-key / MC-12-empty-refresh / MC-12-empty-offline-restart：离线重启快照可见、空目录权威覆盖及夹具计数=1，均保持。
- MC-12-old-record-cannot-reinsert-or-save：缓存读取路径（未刷新）仍清空旧选择并阻止保存，`state.json` 不变——规则 5 边界保持。
- 报告：errors 为空、无监听端口、隔离数据已清理、运行期间源码哈希未变。

## 构建

`npm run build:ui` + `npm run build:desktop` 通过（产物哈希计入验收报告）。`npm run generate`（prisma）在当前 Node 20.12.2 下因 `@prisma/dev` ERR_REQUIRE_ESM 失败；schema 未变，沿用既有生成产物（.nvmrc 要求 Node 24，本机仅有 20）。

## 边界

官方接口为受控夹具，未做真实供应商/付费调用；未跑全量测试（用户指示）；macOS 与安装包不在本轮范围；浏览器用例以系统 Chrome 代替 Electron Chromium。
