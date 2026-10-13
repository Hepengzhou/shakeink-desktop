# 文生图供应商列表：实施与验证

日期：2026-10-13（Asia/Shanghai）。本轮真实共享预设将 bytedance 展示名改为火山引擎，IMAGE 供应商菜单仅留 bytedance/openai，TEXT 范围保持。供应商 variant 的 bytedance/volcengine 别名使用本地火山品牌 SVG；模型家族资产保持。旧 IMAGE 供应商通过 selectedOption 显示，当前值不会加入允许菜单；保留原 ID、端点、协议、已存记录和凭据授权规则。设置及首次引导复用原真实 React 弹窗。

技术方案、用例及代码分别通过独立子代理审核，见本日期 `image-provider-plan-review.md`、`image-provider-test-review.md`、`image-provider-code-review.md`。原其它任务的源码与台账修改保留。

## TDD 与专项

- `unit-red.tap`：修改前 IMAGE 完整列表为九项（含 custom），火山预期名称仍为字节跳动，ProviderLogo 指向旧 bytedance.svg，均为有效行为红灯。未加入新 SVG 的 ENOENT 单列，不以缺文件当行为证明。
- `browser-red.tap`：真实 React/Base UI 旧新增弹窗默认阿里巴巴，与火山引擎要求不同，IP-04 两入口为有效红灯。旧记录场景的布局/可访问定位超时不算产品红灯。
- `browser-green-final.tap`：六项全部通过，覆盖设置及引导两家完整菜单、实际本地火山 SVG、搜索、键盘/鼠标单选、清空旧 Key/型号、旧 Google/custom 显示/保留提交及取消不改原状态。
- `unit-green-final.tap`：62项，60通过、2失败。本轮目录/品牌/selectedOption、旧配置兼容和两个真实仓库引导保存重试全部通过。两失败为 `model configuration: approved close button remains present beside cancel`、`model configuration: catalog choices replace one draft, disable duplicates and retain a failed save for retry`，均已在修改前 `unit-red.tap` 失败；未将它们记作通过，也未改无关断言。

测试基础设施修正保留原日志：沙箱子进程 EPERM；Playwright 未装默认 Chromium 后使用本机 Edge；fixture 使用 Window 保留 closed 属性，改为 closeCount；Combobox.Trigger 的实际 role=combobox，改用真实可访问标签；补弹窗/浮层布局样式，选项图标 alt 与文字共同构成名称，因此改为限定 listbox 的 option 精确文本过滤。没有使用 force 点击。旧 IMAGE 新增 custom 的保存重试夹具被本轮用户要求明确取代，改为允许的 OpenAI 单选，原提交次数/密文次数/错误重试断言保持。

Windows red 初次脚本在 initial load 前 reload 且未完成，已核对命令/父PID/创建时间后停止其测试进程树，不记作行为红灯。随后已保存失败截图及JSON明确显示无品牌标记的非空隔离根触发“无法修复数据目录”；改为真实 Workspaces.initialize/close 后再写测试状态，并等待真实初始弹窗后离线 reload。初始化后的前两次失败分别为旧供应商/TEXT菜单读取早于浮层渲染，日志和截图单列保存；为各菜单加入可见性与完整数量等待后完整重跑通过。以上为脚本前置和时序修正，未修改产品断言或生产源码。

## 品牌来源

沿用项目固定 `@lobehub/icons-static-svg@1.95.1` MIT 包，实际 tarball SHA-512 与原清单 integrity 一致；从 `package/icons/volcengine-color.svg` 原样复制，SHA-256 为 `84f9e2cd1da7e73dc6c9a0f2521745d39cae96c008752cdb1baf57a8c94393a1`。独立审核再次逐字节核对。来源/商标归属登记于 `design/provider-logo-provenance.json`；官网参考为 [火山引擎](https://www.volcengine.com/)。产品使用本地 SVG，不在运行时下载图标。

## 最终构建、全量回归与真实系统

正式 UI Next生产静态构建、Electron main/preload/service 构建与完整 `tsc --noEmit` 均通过（`build-ui.txt`、`build-desktop.txt`、`typecheck.txt`）。全量当前 browser 用例431项全部通过，无失败/取消/跳过（`docs/evidence/chat-empty-state/browser-full-image-providers.json/tap`）。

最终 Windows `green/windows-electron.json` 为passed：paper/ink 两主题共12组通过，另4条完整菜单观察；真实设置/首次引导各主题仅火山引擎、OpenAI，SVG本地完成加载；TEXT仍原13项，火山名称图标同步。旧Google/custom实际UI切换后取消保持原state.json，原供应商留空Key手动保存保留原字段/OS密文字节，正常关闭重开后仍可编辑且记录未删除。保存双主题/两入口/两个旧供应商共8张截图；主代理已查看paper-settings-menu和ink-settings-menu，两家名称/彩色图标正常。errors=0、观察范围renderer HTTP=0，各主题main listener快照=0；所有正常专项隔离根已清理。

完整当前 unit/integration 原始输出为1951项、1877通过、67失败、5取消、2跳过，exit=1，保留 `docs/evidence/chat-empty-state/core-full-image-providers.json/tap`。该原始整轮不能标记通过。

其中28个失败是旧后端测试draft helper从 `presetsFor(IMAGE)` 的界面菜单寻找已移除供应商造成TypeError；另有旧九项菜单断言。将三个helper改用完整内部 `PROVIDER_PRESETS`，把UI数量预期改为两家，保留原旧供应商协议/目录/权限断言；builtin目录测试改为完整按端点目录，恢复其它IMAGE供应商覆盖。独立补审通过后，四个受影响文件重跑76项全部通过（`backend-fixtures-green.tap`）。这属于本轮需完成的测试适配，不称为原有业务失败。

首次全量中新增的BDC06 legacy/current和BDC07 legacy三个目录迁移超时，在完整套件结束后按原断言独立复测，3项全部通过（`migration-timeout-rerun.tap`，无目录迁移源码修改）。整轮原始失败标题中32项由上述重跑或被明确替代的旧菜单预期解决；剩余40条失败/取消标题均在此前composer-height基线出现，新增残留标题=0。对照见 `core-comparison.json`。该基线包含本轮TDD期间尚未实现的IP/ONB菜单三条失败，不能机械称其全部为原有业务失败；对照已单列此限制。

上述结果是原完整套件加变动文件及超时用例复测，不是另一轮全绿完整套件；没有把测试次数相加当成新的全量通过率。两个实施台账的本轮功能为已实现且专项验证通过，`allAcceptancePassed=false`，保留项目核心回归残留。无macOS、安装包或供应商调用验收声明。

最终测试适配后再次 `tsc --noEmit` 通过（命令实际退出0，`typecheck-final.txt`）。Windows源码指纹与215项实际编译资源指纹已独立核对均匹配，42个browser测试文件清单完整；异常red隔离目录在核验绝对路径及临时父目录后清理（`aborted-red-cleanup.json`）。

证据目录：`docs/evidence/image-providers/`；全量套件由现有 runner 写入 `docs/evidence/chat-empty-state/*image-providers*`。运行 Node 使用捆绑 v24.19.0；浏览器 fixture 使用本机 Edge。Windows 专项是开发 Electron + 生产静态 UI、隔离目录和 Playwright/CDP输入，旧配置仅使用OS加密的公开合成凭据，不使用真实数据/Key。网络观测从 firstWindow 后开始并覆盖离线 reload，不作为启动全程网络审计。
