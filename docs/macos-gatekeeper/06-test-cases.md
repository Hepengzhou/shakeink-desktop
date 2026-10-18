# macOS 签名发布测试用例

2026-10-16。依据 `04-implementation-plan.md`；方案通过后由独立子代理审核本用例，再开始 TDD。

| ID | 验证方式与断言 |
| --- | --- |
| MACREL-01 | 默认配置通过已安装 v26 schema；mac 发布启用强制身份/公证/DMG 签名与 JIT，Windows签名/NSIS及publish保持原行为 |
| MACREL-02 | 实际配置生成：mac默认、dmg、zip均为发布；dir不产归档且显式禁签；Windows保持原目标；未知参数拒绝 |
| MACREL-03 | 身份解析：0个、临时签名、开发身份、失效身份拒绝；1个有效Developer ID自动选择；多个必须唯一显式选择；错误/歧义selector拒绝 |
| MACREL-04 | 缺notary钥匙串profile或无身份的实际预检拒绝；受控build端口不能被调用；敏感环境哨兵不进入错误/清单 |
| MACREL-05 | 签名检查控制流包含strict/deep和Apple身份/Team要求、时间戳、hardened runtime、JIT、票据与系统策略；无asar的Resources内.node/.dylib/独立Mach-O也逐一核对同一Developer ID/Team。顶层通过但嵌套代码缺签/异Team、任一步骤失败不得返回通过；权限过宽拒绝 |
| MACREL-06 | DMG公证仅Accepted继续，Rejected/Invalid/Pending/无效JSON/超时均失败；顺序为公证、staple、validate、验包、最终元数据；中间updateInfo不得使用 |
| MACREL-07 | 真实临时文件调用已安装blockmap实现，重新核对每块checksum、总长、文件SHA-512/SHA-256；生成后改变单字节、截断/伪造/损坏blockmap必须拒绝 |
| MACREL-08 | manifest限制文件basename、预期版本/arch/格式、唯一条目，拒绝绝对路径/目录跳转/链接/重复条目/缺包/错误散列/过期metadata；不能用passed:true跳过Apple检查。独立CLI缺外部预期Team拒绝，有效签名但异Team拒绝，manifest自报Team不得覆盖CLI期望 |
| MACREL-09 | ZIP真实恶意条目负例：绝对路径、..、应用外根、绝对/越界/循环链接及链接祖先写穿拒绝；重复原始ZIP路径、文件与目录路径冲突拒绝；在解压前验证完整路径和链接关系；正常Framework内部版本链接及UTF-8应用根允许；独立CRC检查及解压后信任校验必执行 |
| MACREL-10 | 最终化任一步失败，不产生成功manifest或verified目录；无覆盖已有目录；成功promotion只能发生在所有交付物和元数据通过以后 |
| MACREL-11 | 当前原始坏DMG/.app真实运行codesign/系统验包必须被拒绝，记录工具失败为预期负例，不能计为真实签名正例通过 |
| MACREL-12 | 既有资源/依赖/架构/本地化/ZIP CRC/文件表回归，修复归档测试顶层await加载以在现有npm test:package运行 |
| MACREL-13 | 完整core和类型检查；历史失败据实区分，不能用签名小测试替代整组业务 |
| MACREL-14 | 具备真实Developer ID及notary profile时构建签名、公证、附票据；DMG容器及盘内app、ZIP内app全部实际Apple校验通过；重新独立运行package:verify:mac及最终blockmap/散列核验 |
| MACREL-15 | 干净15.7.5 Apple Silicon目标，经保留隔离的真实下载/微信接收、Finder安装、断网首次打开与关闭重开；V8/worker/Sharp/PGlite/导入导出/菜单/设置实际回归 |

MACREL-03至10中的受控命令端口仅验证失败传播/顺序，不伪造有效证书或Apple服务。MACREL-11使用旧坏包并保留散列；MACREL-14/15为外部条件依赖的真实验收，未执行必须保持待完成。所有运行验证使用隔离数据目录。
