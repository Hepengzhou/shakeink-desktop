# 原生菜单剪贴板补充方案

独立审核 R8 已用真实 Monaco/Chrome 自然 6.5 秒 timer 复现：用户激活过期，合法来源与编辑器焦点仍有效，但原 CopyAction 的 execCommand('copy') 返回 false，无 copy 事件；native edit-context 的 CutAction 随后仍删除正文。这与 Windows popup 经 IPC 回到渲染端的生命周期不兼容。即时 CDP evaluate 会重新赋予 userGesture，不能代替此回归。原 UI 和来源范围不变。

桌面公共菜单的 Monaco copy/cut 改用既有受限 writeClipboardText bridge。沿用安装版 Monaco 0.56 的 generateDataToCopyAndStoreInMemory 与该真实 editor 的 view model，取得原复制算法生成的 plaintext；保留模型位置排序、Windows 范围 EOL、空光标/整行复制配置、多光标文本及原 InMemoryClipboardMetadataManager。引用仍使用自己的可见源序列；不把引用的空行连接串当复制文本。适配器采用窄类型的 _getViewModel 读取，仅此安装依赖的内部读接口；缺失接口、空文本、过限、桥接未就绪立即失败，禁止改动正文。

复制生成前检查原菜单及模型/选区 ownership。调用 writeClipboardText 并等待成功。剪切仅在成功后再次核对菜单、连接、原 model/version、selection fingerprint/epoch、readonly epoch，然后调用原 editor.trigger('cut') 编辑 handler，保留原撤销/重做和多光标删除行为。禁止使用先执行原 ClipboardCutAction 再补写的方式，因为它可能在写失败前删除内容。复制和剪切的报错走既有真实错误反馈。

不更改全局 Chromium clipboard permissions，不制造浏览器用户激活，不 dispatch 伪造用户输入，不引入任意 main 脚本执行或新权限。默认键盘及原 Monaco 完整菜单保持；公共菜单操作受既有严格 bridge 文本容量/来源/frame/业务 gate 保护。纯文本是已批准公共文本菜单合同，富 HTML clipboard 未扩展。若内部 helper 的元数据预登记后 OS 写失败，模型和系统剪贴板均不变；不得为恢复缓存而覆盖另一次成功复制的元数据。

验证：独立方案及用例审核 → 自然激活过期 copy/cut red → 实现 → 原多光标/readonly/ABA/布局与 quote 用例 → write 失败与迟到写结果拒绝剪切 → 实际 Windows 原生菜单停留超过 5 秒后的 copy/cut 与 undo/redo → 独立代码复核 → 构建和离线包验收。全部证据仅合成内容。
