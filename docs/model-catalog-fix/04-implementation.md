# 模型目录修复实现

前置调研、产品方案及专项用例均已完成独立审核，记录见 [调研/方案审核](../reviews/2026-10-15-model-catalog-research-review.md)、[用例审核](05-test-review.md)。未运行全量测试。

## 行为变化

- 内置预设改用 `desktop/shared/verified-model-seeds.json`：21 个逐条核对的官方型号，覆盖 13 个非空供应商/类别分组。来源及日期来自独立研究；智谱本轮官方来源未成功获取，种子为空，输入 Key 后可读取真实目录。
- 官方模型目录完成全部分页后标记 `authoritative`，删除 OpenAI/智谱/MiniMax/火山的静态回补。能力分类 `complete` 与传输完整分开，不猜未知型号能力；已下线/类别不符/明确不可用的型号过滤。
- 新主进程 `ModelCatalogRepository` 在应用数据根保存 `model-catalogs.json`。独立于模型/Key手动保存，按供应商、类别、协议、标准化官方端点隔离；串行原子写入，提交前确认操作有效及当前刷新序号。完整空列表同样覆盖；失败、取消、分页中断不覆盖。
- 缓存白名单只含公开目录元数据，不含 Key、用户草稿或账户权限。重启/修改 Key 后 permission 为 unknown，订阅授权不继承。未知能力说明随快照保留。
- 新只读 IPC 由正式 preload 暴露；弹窗异步读盘期间隐藏旧候选。刷新清空已移除的选择和能力；禁止旧记录回插及留空 Key 的保存绕过。保持单选、手动保存/取消和自定义手填。
- 新目录文件加入所有权、闭根清单及数据根迁移白名单；沿用 metadataWrites、根锁和迁移屏障，没有新增 HTTP 服务或备份功能。

## 源码入口

`desktop/shared/builtin-model-catalog.ts`、`desktop/shared/verified-model-seeds.json`、`desktop/main/model-catalog-repository.ts`、`desktop/main/model-configuration.ts`、`desktop/main/model-provider-adapters.ts`、`src/components/desktop/ModelConfigurationDialog.tsx`。IPC接入和根迁移改动均在 [代码审核](06-code-review.md) 中列出。

## 红灯与审核修复

未修复基线执行后，完整目录仍回补缺失 ID、空目录复活种子、不可用项仍保留等断言失败。未实现仓库模块导致的导入失败与有效行为红灯分别记录，不作为同一类证据。

独立代码审核指出：引导保持弹窗挂载，重开后旧 live 目录优先于新磁盘快照。已在关闭/重新读取时失效 live 状态、限制加载候选，并用 mounted-reopen 的 MC-10 覆盖。受限订阅型号仅在当前认证枚举及订阅凭据同时成立时可选，刷新存在性快照不传递授权；独立 MC-07 已验证。

最后只清理了文件末尾多余空行，未扩大业务/UI改动。最终验证和源码哈希见后续验收记录。
