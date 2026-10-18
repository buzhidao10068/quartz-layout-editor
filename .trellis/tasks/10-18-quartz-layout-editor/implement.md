# 执行计划

单文件产物，但分阶段落地并逐段验证。每个阶段结束都有可验证的产出，不堆到最后一次性调试。

## 阶段 0：测试夹具

- [ ] 0.1 把项目实际的 `quartz.config.yaml`（312 行、46 个插件条目）复制为 `fixtures/real-config.yaml`，作为解析和回写的黄金样本
- [ ] 0.2 从 Quartz 仓库取 `quartz.config.default.yaml` 存为 `fixtures/default-config.yaml`，作为第二个样本（结构相同但内容不同，防止解析器被单一样本带偏）
- [ ] 0.3 建 `fixtures/README.md` 说明两份样本的来源和用途

验证：两份文件存在，`real-config.yaml` 为 312 行 / 46 条目。

## 阶段 1：解析器

- [ ] 1.1 `splitTopLevel(lines)` → 三段行区间
- [ ] 1.2 `parsePlugins(lines, span)` → entry 数组，含 span / enabledLine / layoutSpan
- [ ] 1.3 `parseLayoutSection(lines, span)` → groups + byPageType
- [ ] 1.4 解析失败路径：遇到不认识的缩进或语法，抛带行号的错误

验证（阶段 1 最关键，错了后面全错）：
- 对 `real-config.yaml` 解析出 **46** 个 entry（已核对：`Select-String '^  - source:'` 得 46）
- `explorer` 的 layout 为 `{position: 'left', priority: 50}`
- `tag-list` 的 `enabled` 为 `false`
- `search` 的 `group` 为 `toolbar`、`groupOptions.grow` 为 `true`
- `byPageType['404'].positions` 三个键都是空数组
- 对 `default-config.yaml` 同样不抛错

写一个临时 `test.html` 跑这些断言并打印结果，阶段 4 结束后删掉。

## 阶段 2：回写与 diff

- [ ] 2.1 `emitLayoutBlock(entry)` → 生成 `layout:` 块的行数组，缩进 4/6/8
- [ ] 2.2 `emitLayoutSection(state)` → 生成整个顶层 `layout:` 段
- [ ] 2.3 `generate(state)` → 补丁从后往前应用，返回输出行数组
- [ ] 2.4 `diffLines(a, b)` → LCS，返回带类型的行列表

验证：
- **空操作幂等**：解析 `real-config.yaml` 后不改任何东西直接 generate，输出与输入逐字节相同（AC2）。这条过不了就不要往下走。
- 对 `default-config.yaml` 同样幂等
- 改一个 entry 的 position，diff 只含该 entry 范围内的行（AC3）
- 给一个无 layout 的 entry 加 layout 块，缩进与邻居一致（AC4）
- 多个 entry 同时改动时，行号不串位（这是 2.3 从后往前应用的那个坑，单独构造一次 3 处改动的用例）

## 阶段 3：组件目录与渲染

- [ ] 3.1 内嵌 18 个组件的目录常量（source / 显示名 / defaultPosition / defaultPriority / category）
- [ ] 3.2 `slotEntries(pos)` → 复刻 `resolveGroups` 的排序逻辑，含隐式放置
- [ ] 3.3 槽位 grid 布局 + 卡片渲染
- [ ] 3.4 托盘渲染，区分「已禁用」与「隐式放置中」
- [ ] 3.5 非布局插件区（目录中不存在的 source 落到这里）

验证：
- 导入 `real-config.yaml` 后，`left` 槽位的可见顺序是 `page-title` → toolbar 组（`search` / `darkmode` / `reader-mode`）→ `spacer` → `explorer`，与按 priority 10/20-35/25/50 加组优先级 35 推算的结果一致（AC1）
- `tag-list`（`enabled: false`）出现在托盘且灰显
- 人为把某 entry 的 layout 块删掉再导入，它应出现在托盘且为虚线态（AC5）

## 阶段 4：交互

- [ ] 4.1 `move(id, dir)` / `place(id, pos, index)` 两个底层函数
- [ ] 4.2 HTML5 拖拽接到 `place`
- [ ] 4.3 卡片上的上移/下移按钮接到 `move`
- [ ] 4.4 priority 重排逻辑（开关两种模式）
- [ ] 4.5 组盒子的拖入/拖出 → 赋值/清除 `group`
- [ ] 4.6 aria-live 播报

验证：
- 纯键盘完成一次跨槽位移动（AC8）
- 重排开启时，组内改序不导致组盒子在槽位内移位
- 重排关闭时，新放入的卡片 priority 落在相邻两者之间

## 阶段 5：属性面板与 byPageType

- [ ] 5.1 属性面板：enabled / position / priority / display / condition / group / groupOptions
- [ ] 5.2 `groupOptions` 布尔项做成三态
- [ ] 5.3 双重身份插件的禁用警告（AC6）
- [ ] 5.4 byPageType 面板：template 下拉 + exclude 输入 + 六个清空复选框
- [ ] 5.5 面板上写明「不支持添加组件」；选中 `minimal` 时警告会丢弃四个槽位（C6）

验证：
- 勾选「清空 right」后输出 `positions:` 下有 `right: []`（AC7）
- 禁用 `table-of-contents` 出现转换器警告

## 阶段 6：输入输出与收尾

- [ ] 6.1 文件导入，顶栏显示文件名 + 时间
- [ ] 6.2 内嵌演示配置 + 明确的演示标注
- [ ] 6.3 输出弹窗：整份 yaml + diff 折叠区 + 复制（含 execCommand 回退）
- [ ] 6.4 主题切换
- [ ] 6.5 手机宽度不横向滚动
- [ ] 6.6 删除临时 `test.html`
- [ ] 6.7 README 补充：使用说明、v5 限定、C3 导致的 VS Code 误报说明

验证：
- 断网 + `file://` 打开，全流程可用（AC9）
- **端到端**：导入真实配置 → 改动若干 → 复制输出 → 粘回 `H:\learn\github\buzhidao10068\Quartz\quartz.config.yaml` → `npx quartz build` 成功 → 页面布局与编辑器预览一致（AC10）

## 验证命令

这个项目没有 lint / typecheck / 测试框架（单文件零依赖，装一套工具链的成本超过收益）。验证靠：

```bash
# 幂等性与解析断言（阶段 1-2，临时夹具）
# 浏览器打开 test.html 看断言输出

# 端到端构建验证（阶段 6）
cd H:\learn\github\buzhidao10068\Quartz
npx quartz build
```

如果后续文件规模涨到难以手工验证，再考虑引入 vitest + jsdom，但不在本任务范围内。

## 回滚点

- 阶段 2 的幂等性测试是硬门槛。过不了说明解析器的 span 信息不可靠，回到阶段 1 重做，不要靠在回写阶段打补丁绕过。
- 阶段 6 端到端若 `npx quartz build` 失败：先用 git 恢复 Quartz 项目的 `quartz.config.yaml`（那是用户的真实站点配置），再排查。改动前先确认该文件已提交或已备份。

## 审查关口

- 阶段 2 结束：幂等性 + 定向改动两条必须亲眼确认通过，再进阶段 3
- 阶段 4 结束：键盘路径必须亲手走一遍，不能只看代码认为能用
- 阶段 6 结束：端到端构建验证通过才算完成
