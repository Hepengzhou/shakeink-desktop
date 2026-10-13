# 测试用例：版本与三个 Star 入口

日期：2026-10-13。执行结果另写验证文档；本文件不是通过记录。

| ID | 用例与预期 | 层级 |
| --- | --- | --- |
| VS-01 | package/lock根版本一致0.10.0-alpha且合法；显示0.10-alpha；0.10.1-alpha、0.10.0-beta、普通版本不误改 | unit + Windows |
| VS-02 | 设置关于末行为强调邀请，版本/反馈/文档仍存在，主题切换强调可见 | real React + Windows |
| VS-03 | welcome邀请仅welcome分支可见；Star不退出、不提交引导；主“开始创作”退出并回焦 | real React + Windows |
| VS-04 | React两入口点击只调用固定无参IPC；Enter/Space可操作；等待时防重复；失败提示且重试恢复 | browser |
| VS-05 | Windows关于实际版本/独立窗口/精确链接；无node/preload/script、CSP；版本特殊字符转义 | unit + Windows |
| VS-06 | 关于导航精确URL才系统打开，恶意协议/主机/查询/子路径/额外popup拒绝；拒绝时错误可重试 | unit + Windows |
| VS-07 | 主窗口 trusted IPC 真实转发精确仓库；新IPC拒绝其它窗口/frame/origin且不调shell；用户未点击无外部请求 | source contract + Windows |
| VS-08 | macOS保持showAboutPanel，显式空build version，原生Credits.html内文案/精确链接/无脚本；mac.extraFiles输出路径正确；原生打开/失败归系统管理 | unit静态；真实macOS另验收 |
| VS-09 | paper/ink（包括与OS相反）、800×600、150%应用缩放，设置行保持左右无横溢出，welcome主按钮可滚动抵达 | Windows |
| VS-10 | 冷启动/离线reload，默认0模型、0HTTP监听快照；点Star前后状态文件不变；关闭重开版本一致 | Windows（观察边界明示） |
| VS-11 | 完整unit/integration、browser、typecheck、UI/main构建、packaging检查，所有失败保留并与基线对比 | full regression |

TDD先写本轮断言并记录实现前红灯，然后实现并记录绿灯。缺模块导致失败只记加载失败，不冒充行为红灯。实际Windows路由测试拦截shell.openExternal验证精确参数，不能等同系统浏览器真的打开；单次真实打开若执行须另行注明。macOS真机缺失只记未执行。
