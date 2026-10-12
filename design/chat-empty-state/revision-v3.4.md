# AI 对话首屏 v3.4 · 宣纸右图暖黄

范围仅本地HTML设计稿。2026-10-12独立按“方案→用例”顺序审核，均通过，无方案阻断。

方案仅对`.chat-panel[data-theme=paper] .card-art`使用`grayscale(1) sepia(.5) brightness(.62)`，保留`opacity:.5`。先去除原紫/青色，再赋予暖灰黄色；玄墨沿用`grayscale(1) brightness(.62)`。选择器不覆盖小图标、卡面、Logo、题材图片；不改HTML、JS或素材。保留低亮度和透明度参数，最终柔和程度由实际截图判断，不把参数相同等同于所有像素亮度完全不变。

用例沿用现有12组，只修改V3-03主题filter预期并补充该处证据：两主题四右图在实际hover播放0至12每帧均维持指定filter/opacity；普通/hover均检查卡面和小图标未受滤镜影响；逐帧同时核对Logo。保存两主题四卡的首帧与展开帧截图，目视核对宣纸偏黄、玄墨仍灰。其余交互、布局、真实模板与离线检查保持原用例，不新增测试组。

首次覆盖输出前已保存`evidence-v3/baseline-v3.3-preview-checks.json`，SHA-256为`377308f177691222923543c937139c0e32f08cfc3e0128e76d7bf2af87a07083`，运行后复算仍一致。新报告designRevision为3.4。

主代理提供的实际红灯记录：旧版纸色四右图都是`grayscale(1) brightness(0.62)`，`warm=false`，退出1。随后只新增纸色CSS覆盖，并将审核页标签标为03.4以辨识版本；JS与素材不变。主代理直接绿灯退出0：两主题四右图filter符合各自预期，书图hover停在12。独立代理不重复旧版红灯，在冻结文件上完整运行一次。

**最终独立审核通过，无未关闭阻断。** 实现核对`preview.css:94–95`：基础灰度及透明度保留，新增规则仅命中宣纸右图；`index.html:26`只更新审核标签。与3.3报告逐项比对，assets目录及预览/向导JS、数据、生成器共65个文件的哈希均未变化。

`node design/chat-empty-state/verify-preview.mjs`退出0，最终`preview-checks.json`时间为`2026-10-12T13:44:31.035Z`：**12组通过、0失败、1个子项未执行**。V3-03实际采集两主题四右图的8条0至12完整序列，共104帧状态，filter与opacity均符合预期，hover持续有效，卡面/小图标/Logo未受滤镜影响；其余原有交互回归全部通过。浏览器异常、失败资源及HTTP(S)请求均为0。

独立目视纸色四卡首帧/12帧截图（`evidence-v3/v3.4-art-paper-*-0.png`与`*-12.png`）：右图为柔和暖灰黄，保持半透明且未恢复原紫/青色。玄墨四卡12帧及书图首帧仍为低亮灰色；小图标保留各自颜色。运行后复算HTML、CSS、两JS、数据、两生成器、两清单及验证器共10文件，全部与V3-12相符；最终CSS SHA-256：`7d59b1550090f9340ee61d70f4315f9997e4c7b19412a37ae3775b0cc6e382b4`。本文最终结论在运行后追加，报告内本文哈希代表执行时版本。

真实window blur已验证；真实`document.hidden`仍因当前headless Chrome没有暴露该状态而未执行，未用合成事件替代。`allExecutedAssertionsPassed=true`、`fullCoverage=false`。结论仅针对本地HTML原型，不表示安装版或用户UI验收通过。
