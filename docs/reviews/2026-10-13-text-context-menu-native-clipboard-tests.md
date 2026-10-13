# 原生菜单剪贴板补充用例

使用真实安装版 Monaco 和同一生产 adapter/controller。不得用最后一次 CDP evaluate 来选择延迟菜单，因为它附带 userGesture。一次 evaluate 只安排自然 timer，6.5 秒后在激活 false、document/editor focus true、原 model/selection current true 时选择原 pending menu；之后才读取结果。桌面桥接 writeClipboardText 在 fixture 内明确模拟授权原生 IPC 写入 Chromium 真 clipboard；记录 bridge 调用、真实 clipboard 和真实 model，区分它与原生 Electron 证据。

- NC-01 copy：激活过期后仍写入精确 Alpha；模型和 selection 不变，桥接一次，没有任意权限修改或用户激活制造。
- NC-02 cut：激活过期后桥接精确写入 Alpha，再删除所选范围；一次 undo/redo 恢复/重做，原非选区不变。
- NC-03 write rejected：copy/cut 报错，model/version/selection 不变；尤其 cut 不调用删除路径。
- NC-04 write pending：待写确认时 selection/model/readonly ABA、menu cancel/context 改变使迟到 cut 不删除任何模型。不得以 A→B→A 后相同快照恢复授权。
- NC-05 实际单/多范围 Unicode、跨行 EOL、含空光标的原 emptySelectionClipboard 配置，与停用公共 controller 时的原复制 plaintext 逐项比较；原 native clipboard metadata 支持的普通 paste/undo 行为保持。
- NC-06 真实 Windows 原生 popup 停留超过 5 秒后人工菜单项选择，核对 OS clipboard、原正文、undo/redo；copy 失败不得用瞬时成功替代，cut 写失败不得丢正文。

在实现前保存 red；实现后保存 green。全部原菜单、Monaco layout/quote/source守卫回归继续执行。不会把浏览器 IPC fixture、平台模拟或未执行目标记为原生通过。
