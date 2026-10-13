# 文本右键菜单测试用例

依据已批准UI与正式方案。每组分别验收菜单入口、显示状态、精确操作与持久化；HTML的21项检查仅作设计证据，不冲抵生产测试。所有夹具使用隔离目录与合成消息、作品、Key占位，没有真实供应商调用。

## 协议和原生菜单单元测试

- TCM01：requestId UUID、来源enum、九项固定boolean与有限坐标校验；未知字段、正文、Key、任意命令、NaN/Infinity、超限坐标拒绝。结果与取消必须同requestId。
- TCM02：preview七项且没有undo/redo；input/editor九项，editor额外保留原编辑器菜单入口。只读input仍有历史且disabled；分隔线不连续、不首尾。引用无虚构快捷键，基本项取真实绑定（自定义/移除/平台/多绑定）。
- TCM03：打开、点击、Esc/关闭回调、popup异常、窗口blur/closed、同窗口replace全部释放pending/listeners；跨窗口互不执行；迟到cancel(A)不关闭B，迟到结果不能绑定新窗口/frame/请求。popup缩放和屏幕边缘clamp真实有限。

## 选择与来源真实组件测试

- TCM04：AI用户消息和AI回复分别拖选、双击词、三击整段，单次右键仅一个菜单；复制结果精确到本次选择。用户消息父容器边界回归先失败再绿；跨来源选区仅取本次静态来源，无交集时copy/quote disabled；反向选择恢复方向。
- TCM05：Markdown/正文预览跨段、表格、代码、链接、评论原文/评论内容/卡片摘要的可选文本；quote与copy保留可见换行/Unicode。全选排除工具栏/按钮/相邻消息，cut/paste/delete disabled，无history。卡片左键、拖拽、正文评论锚点和按钮保持原行为。
- TCM06：真实Input/textarea与React受控值：copy/cut/paste/pastePlain/delete/selectAll/undo/redo作用原范围并更新状态；剪切/删除/引用一次撤销可恢复，redo恢复。无选区仍弹菜单，copy/cut/delete/quote disabled，paste/selectAll按能力。
- TCM07：email/number/date/datetime-local/month/week/time逐类型真实Chrome与Electron选取/右键；无selectionStart时仍可copy/quote/selectAll，原生不支持的修改项依queryCommandEnabled禁用。不得把整个value冒充部分选区；精确选择和显示值区别有断言。
- TCM08：generic contenteditable与plaintext-only支持基本编辑，普通只读/可选disabled控件可copy/selectAll而不写入。Dialog/Portal里的真实输入正常编辑，modal背景quote disabled；关闭Dialog不丢原控件值。
- TCM09：普通password禁copy/cut/quote；标记API Key保留旧copy/cut/paste/undo但quote disabled。合成字段不出现在证据文本或菜单内容；旧API Key协议回归与新的统一菜单分开验证。

## 真实composer引用和异步守卫

- TCM10：无模型但可准备草稿，quote精确新增 `> ` 引用、展开同一ChatPanel并聚焦末尾新行；原草稿/普通chip（含稳定payload）保留，源原文不变，没有send/会话创建/供应商请求；quote一次native undo/redo正确，序列化/重建/重开可恢复。
- TCM11：源是composer时取快照再追加，chip来源quote仅可见标签，copy/cut仍携带旧稳定序列。包含字面 `@[场景/名称](scene:其他作品:标识)` 的新增引用采用新引用必要转义，追加/重建/发送准备不新建chip或迁移身份；旧 `> @[角色/名](id)` 真正chip恢复不退化。正常Unicode、空格、多行及XSS样文本保持纯文本。两层分别断言：草稿/存储/原UserMessage保持明确escaped源文本（该消息使用escapeHtml，不执行Markdown反转义）；普通Markdown渲染可显示反转义后的原文字面量，但现有Markdown后处理实体化不在本引用写入路径内，不宣称全局linkifyHtml/AI输出永不实体化，原解析行为保持。
- TCM12：IME组合、restoring/creatingNovel、requested/newConversation/isLoading/error期间quote禁用。菜单打开后A→B→A会话/作品切换、source卸载、model换绑、DOM/属性/内容ABA、input同值ABA、selection变化、窗口失焦、重开菜单、dispose均拒绝旧操作。
- TCM13：menu Promise和clipboard读/写分别delayed，错误与取消如实返回；write后cut删除、read后paste前再复查，不能修改新控件。quote目标lease需每次最终插入前有效；没有pending promise或observer泄漏。

## Monaco与目标系统

- TCM14：真实Monaco普通/只读/多光标；文字区右键公共菜单、非主范围不折叠；按模型位置排序连接引用。undo/redo真实模型历史，paste/delete/edit保持模型、自动保存与comment ViewZone。find和ViewZone输入走普通input，scrollbar/装饰保留原菜单；editor.context一次打开原菜单，保留其可用动作，不双弹。
- TCM15：Windows实际Electron（合成作品、零模型）逐类看见并选择原生条目，核对系统clipboard、正文、草稿、undo/redo、重开；双主题、键盘菜单、Dialog、zoom与窗口边缘验证。构建/离线安装包启动，product无HTTP监听/远程资源依赖；macOS与物理IME分别真实执行，缺少目标则标待验收。

## 执行与证据

先方案独立审核（已完成），再本用例独立审核；编写失败的菜单/真实组件回归并保存red结果，TDD实现后保存green。独立code review后运行专项、全量unit/integration/browser、typecheck/build和Windows实际菜单。已有全量基线单独保存 `docs/evidence/text-context-menu/core-before.tap`，后续比较实际失败标题/原因，不把预先失败或未执行宣称通过。验收报告逐项链接命令结果/截图/文件变化；总结时明确全部通过与待验收边界。
