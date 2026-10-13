# 实现记录

日期：2026-10-13。按本目录01→02→03/index.html→04/05方案审核→06/07用例审核→TDD→08代码审核推进。

- `package.json` 与 lock 两处根版本从0.1.0更新为0.10.0-alpha；用户界面显示0.10-alpha，真正包元数据保持SemVer，原本其它版本不误改。
- `project-info.ts` 集中固定仓库地址、提示和三份友好文案。bootstrap/native About从真实app.getVersion派生用户版本。
- SettingsDialog关于分组末行挂载ProjectStarPrompt，用主题色轻背景、左侧色线和星标突出，保持左右关系；OnboardingController只在welcome正文挂载另一份文案，主footer与完成/焦点逻辑保持。
- 两个真实React入口复用按钮pending、同步锁、错误/重试能力，通过无参preload IPC打开固定仓库；不提交业务数据。
- Windows独立关于受限窗口显示真实版本和支持链接，精确URL转shell，其它目标与所有内部popup拒绝。真实测试发现取消同页导航使Playwright等待不结束，改target=_blank并由main拦截转系统；新路由已补单测与独立复审。
- macOS保持原生About、version空串、不覆盖credits；安装包附带Resources/Credits.html。实际macOS尚未执行。
- 保留关于文字不可选择的旧浏览器行为断言，读取新真实HTML helper。macOS历史打包用例/脚本改为从当前package派生版本与归档名，不读取旧0.1.0。
- 本轮引入共享组件/helper后，现有受控unit harness出现15条依赖缺失。仅补依赖，保留原onboarding事务/模型/关于断言。57条受影响回归复测55通过，另2条为基线已存在的模型配置失败；未把这轮记为全绿。

没有新增依赖，没有修改上游仓库，工作台/AI composer/业务面板沿用原真实React。其它任务已存在的修改保留，未提交或发布。
