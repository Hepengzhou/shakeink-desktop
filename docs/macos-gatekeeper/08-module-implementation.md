# macOS 信任验包与发布最终化模块实现

日期：2026-10-16。依据通过审核的 04 实施方案、05 方案审核、06 用例和 07 用例审核实施。本文仅记录 `scripts/macos-release.mjs` 与其新增测试，不表示证书、公证或真实目标机器验收已完成。

## TDD 与执行证据

执行运行时固定为 `/Users/dt_flys/.nvm/versions/node/v24.18.0/bin/node`。先新增用例后执行，模块尚不存在时 13 项全部失败，原始输出见 [module-red.tap](evidence/module-red.tap)；随后实现模块，并补充清单篡改、系统门重跑、原生子项与时间戳/权限失败断言。独立 code review 后进一步补强真实坏包绑定及实际归档流程，最终 18 项全部通过，见 [module-green.tap](evidence/module-green.tap)。最终命令：

```sh
/Users/dt_flys/.nvm/versions/node/v24.18.0/bin/node --import tsx --test --test-reporter=tap tests/unit/macos-release.test.ts tests/packaging/macos-trust.test.ts
/Users/dt_flys/.nvm/versions/node/v24.18.0/bin/node --check scripts/macos-release.mjs
/Users/dt_flys/.nvm/versions/node/v24.18.0/bin/node node_modules/typescript/bin/tsc --noEmit
```

其中 16 项为真实临时文件/受控命令端口的单元验证，2 项为真实原坏 `.app` 和 DMG 的原生拒绝负例。旧 DMG 在新验包器调用前后 SHA-256 相同，失败发生于挂载前的签名门。原生负例只证明坏包被拒绝，受控命令正例只证明顺序和失败传播；均不计为真实 Developer ID、公证、干净机器启动的正例验收。类型检查通过，完整输出见 [module-typecheck.log](evidence/module-typecheck.log)。

## 独立审核补强

- MACREL-11 不再仅以预期 Team 导致的任意拒绝为坏包证据。测试固定绑定调查证据中的 DMG SHA-256 `2abef4f3708c20b4dd19e09db39ddc7c0659bf6dbba154b50dc2d19a3c291cda`、主程序 `c9da78c3c79b9e6d6714fbf2a1136c4eb4a93cc5edad0f8ccfb058d681325e7e` 和 Info.plist `65318907738efce8f2837619ae8e363c409cad3a332f9f5d3fd9c25f9d466c44`，先不带 `-R` 执行真实 codesign strict/deep，断言实际完整性错误及退出码 1；DMG 断言实际未签名错误。随后新验包器必须在 codesign 门拒绝，非任意异常。
- 极小 ZIP 实际运行 `unzip -tqq`、`ditto -x -k`，证明先 CRC、再解压、再进入内层 codesign；改变存储内容而保留 CRC 的实际文件必须停于 unzip，不能执行 ditto。内层 codesign 的拒绝由受控端口提供，不算真实签名正例。
- DMG 控制端口只在自有临时路径建立实际 fixture app；测试内层信任失败后确实 finally detach，以及 detach 失败后目录仍保留。没有挂载真实磁盘；测试在证实保留行为后清理假挂载目录。
- 最终化分别覆盖 staple 异常、票据 validate 异常与实际侧文件符号链接导致的 metadata 异常；各阶段都断言没有成功清单或 verified 目录，metadata 失败也不能改写链接指向的哨兵文件。没有新增绕过被测归档流程的注入端口。
- 公共选项和命令端口新增有界 JSDoc 类型：环境为字符串映射，命令结果允许未返回 stderr，验包选项声明 Team/arch，测试验证端口返回 unknown。`runChecked` 明确 UTF-8，并只保留数值退出码供下一层脱敏错误保留，不记录命令原始错误。

## 导出接口与处理边界

| 接口 | 行为 |
| --- | --- |
| `releaseMode(platform,args)` | mac 默认/DMG/ZIP 返回 release，dir 返回 local；Windows 保留默认 NSIS/dir，未知或多参数拒绝。 |
| `selectDeveloperIdentity(text,selector)` | 只解析有效列表中完整的 Developer ID Application，排除失效/开发身份；多个身份必须显式唯一选择。 |
| `preflightMacRelease({env,run})` | 要求公证 profile、有效身份、工具、Gatekeeper assessments enabled；拒绝会覆盖 profile 的 Apple ID/API 认证环境项。用只读 `notarytool history` 实际验证 profile 认证，缺失/认证错误在 build 前停止；不保存或输出历史。 |
| `createPackagingConfiguration(base,options)` | 正式 mac 用身份指纹、强制签名、公证、DMG 签名，关闭中间更新元数据并输出 staging；local 显式禁签/禁公证；Windows 保留现有设置并关闭强制签名。 |
| `verifyMacSignature(app,options)` | 外部 Team 和架构为必填。先 strict/deep/Apple requirement，再扫描所有 Mach-O 和 bundle，逐项校验 Developer ID、同一 Team、时间戳、所需 hardened runtime、最小 entitlement 与二进制架构，最后票据和系统策略。 |
| `validateZipArchive(path)` | 解压前直接解析原始中央目录及本地头，拒绝重复、文件目录冲突、大小写/Unicode 别名、应用外根、绝对/越界/循环链接、链接祖先写穿、头部不一致；允许 Framework 版本相对链接。ZIP64、加密、多卷和非标准条目显式失败。 |
| `generateArtifactMetadata(path)` | 从最终归档字节调用已安装 builder 的 `buildBlockMap(...,'gzip',sidecar)`，生成 size、SHA-512(base64)、SHA-256 和 sidecar hash。 |
| `verifyArtifactMetadata(directory,entry)` | 拒绝符号链接和不安全名称，重算完整文件/sidecar 散列，并逐块按实际范围计算 BLAKE2b-18，与压缩 blockmap 比对。 |
| `verifyMacArtifact(project,path,options)` | DMG 先容器/签名/票据/open 策略，随后仅在自有临时目录只读挂载；ZIP 先安全预检、独立 unzip CRC、ditto 解压。归档内 app 继续完整信任门及既有资源/依赖检查。 |
| `finalizeMacRelease(project,staging,options)` | 要求严格的预期 DMG/ZIP 集合；DMG 只有 Apple Accepted 才 staple/validate；所有归档验过再生成最终元数据和清单，通过独立完整性检查后原子改名为唯一 verified 目录。任何错误均不生成成功目录/清单，不覆盖旧包。 |
| `verifyReleaseDirectory(project,directory,options)` | 外部 Team 为必填；严格 schema、版本、架构、唯一文件集合、普通文件及散列/blockmap，随后重新跑归档/Apple 信任门，不接受清单 passed 自报。 |

`runChecked` 和内部命令封装一律使用 execFile 参数数组；异常只包含工具名与非敏感退出状态，丢弃原始认证错误、参数和环境。没有在本模块中写入账号、密码、证书、私钥或公证授权。

正式 `.app` 的开发者身份通过 Apple anchor、Developer ID intermediate/leaf OID、预期 Team requirement 交由 codesign 验证，并核对 display 身份链；Resources 内 `.node`、`.dylib`、无扩展名 Mach-O 也逐项处理。既有 `inspectPackagedApp` 和 `verifyPackagedDependencies` 继续验证实际业务资源和依赖；后者为 Node 资源探测，不启动 Electron，也不计为业务运行验收。

清单格式为 `shakeink-verified-macos-release` / schemaVersion 1；清单仅记录版本、架构、Team、目标、核验时间/范围及交付物最终元数据，不存储 profile、keychain 或签名认证数据。最终目录只保留声明的 DMG/ZIP、重新生成的 blockmap、`release.json` 和 `SHA256SUMS.txt`，builder 临时更新信息与中间资源报告留在 staging。

## 当前限制及后续验收

本模块未修改业务源码、运行应用、访问用户数据、读取钥匙串凭据或改动既有发布包；只按授权编写构建发布模块及限定测试/文档。当前没有真实 Developer ID 与已验证公证认证，正式签名构建、公证 Accepted、最终 DMG/ZIP 全门重验以及干净 macOS 15.7.5 的隔离下载/离线首次启动仍待执行。ZIP64 当前显式不支持；未来大于当前 ZIP 范围的交付物须扩展解析与负例后才能发布。

独立 code review 和整包/类型/core 回归由主代理后续组织。只有实际完成正式包与目标系统验收，才能声明用户要求的全部校验通过。
