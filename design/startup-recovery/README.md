# 数据目录恢复设计 v1（待审核）

配置目录（`[用户目录]/.shakeink/`）丢失或损坏时的启动恢复界面设计。

- `index.html`：审核壳（场景/主题/尺寸切换）。
- `flow.html` + `flow.js` + `preview.css`：应用内对话框设计稿，可交互演示（重置 → 二次确认 → 进行态 → 完成自动重启）。
- `capture-preview.mjs`：只检查 HTML 设计稿的截图与断言脚本，不启动应用、不访问网络。运行：`node design/startup-recovery/capture-preview.mjs`。
- 调研与产品设计：`docs/reviews/2026-10-11-startup-recovery-research.md`、`docs/reviews/2026-10-11-startup-recovery-product-design.md`。

场景清单：01 自动检查（自动初始化/修复，无按钮）、02 无法修复·恢复对话框（退出应用 / 重置配置数据）、03 重置二次确认（红色警示 + 返回 / 确认清空并重置）、04 正在重置、05 重置完成·自动重启进引导、06 重置失败·可重试、07 自定义目录丢失·定位原目录窗口新增重置出口。
