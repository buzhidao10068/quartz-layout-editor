# 执行计划

单文件产物，分阶段落地，每个阶段结束都有可验证的产出，不堆到最后一次性调试。

## 禁令（所有阶段适用）

`H:\learn\github\buzhidao10068\Quartz` 是用户的真实站点。**允许读、允许复制；不允许修改或删除任何文件，不允许在里面执行 git、npm、npx 或 Quartz 构建。** 阶段 0 复制一次真实配置之后，所有测试都只用副本。

## 阶段 0：测试夹具

- [x] 0.1 `fixtures/default-config.yaml` ← Quartz v5 官方 `quartz.config.default.yaml`（GitHub raw，`v5` 分支）
- [x] 0.2 `fixtures/local/real-config.yaml` ← 复制 `H:\learn\github\buzhidao10068\Quartz\quartz.config.yaml`。只读复制，源文件不动
- [x] 0.3 `.gitignore` 加一行 `fixtures/local/`
- [x] 0.4 `fixtures/README.md`：两份样本的来源，以及 local 为什么不进仓库

验证：
- `real-config.yaml` 为 312 行、46 个 `^  - source:` 条目
- 复制前后记录源文件的 `LastWriteTime` 和大小，两次相同（证明没碰到源文件）
- `git status` 里看不到 `fixtures/local/`

## 阶段 1：core 骨架与解析器

- [x] 1.1 建 `index.html` 骨架，五段按 spec 的 Structure 排列
- [x] 1.2 `tests/load-core.mjs`：读 `index.html`，取出 `<script id="core">` 的源码，在 `vm` 里执行并导出其中的函数
- [x] 1.3 `normalize(text)` → `{ lines, finalNewline }`
- [x] 1.4 `splitTopLevel(lines)` → 三个顶层段的行区间
- [x] 1.5 `parsePlugins(lines, span)` → entry 数组，含 span / enabledLine / layoutSpan
- [x] 1.6 `parseLayoutSection(lines, span)` → groups + byPageType
- [x] 1.7 解析失败：遇到不认识的缩进或语法，抛出带行号的错误

验证（`node --test tests/core.test.mjs`）：
- `real-config.yaml` 解析出 46 个 entry
- `explorer` 的 layout 为 `{ position: "left", priority: 50 }`
- `tag-list` 的 `enabled` 为 `false`
- `search` 的 `group` 为 `toolbar`，`groupOptions.grow` 为 `true`
- `byPageType["404"].positions` 的三个键都是空数组
- `default-config.yaml` 解析不抛错
- CRLF 变体：`enabled` 解析为布尔值 `true`，不是字符串 `"true\r"`
- BOM 变体：能认出 `configuration` 顶层键

## 阶段 2：回写与 diff

- [x] 2.1 `emitLayoutBlock(entry)` → `layout:` 块的行数组，缩进 4 / 6 / 8
- [x] 2.2 `emitLayoutSection(state)` → 整个顶层 `layout:` 段
- [x] 2.3 `generate(state)` → 补丁从后往前应用，返回输出文本
- [x] 2.4 `diffLines(a, b)` → LCS，返回带类型的行列表
- [x] 2.5 `tests/yaml_paths_diff.py`：用 PyYAML 读入两份 YAML，以 JSON 列表输出变化的路径

验证：
- **空操作幂等（AC2，硬门槛）**：两份夹具 × 四种变体（LF / CRLF / 带 BOM / 无末尾换行），不改任何东西直接生成，diff 为空；LF 且不带 BOM 的输入，输出逐字节相同。这条不过就不往下走
- 改一个 entry 的 position，diff 只包含该 entry 范围内的行（AC3）
- 给一个没有 layout 的 entry 加 layout 块，缩进与相邻条目一致（AC4）
- 同时改 3 处，行号不串位（这是「从后往前应用补丁」要防的坑，单独构造用例）
- AC10：上面每个用例的输出都交给 `yaml_paths_diff.py`，变化路径等于预期集合；所有 position / display 取值在 `types.ts` 的类型范围内

## 阶段 3：组件目录与渲染

- [x] 3.1 在 core 里内嵌 18 个组件的目录常量（source / 显示名 / defaultPosition / defaultPriority / category）
- [x] 3.2 `slotEntries(state, pos)` 放在 core 里：复刻 `resolveGroups` 的排序，包括隐式放置
- [x] 3.3 槽位网格布局 + 卡片渲染
- [x] 3.4 托盘渲染已禁用的组件；隐式放置的组件画在它的默认槽位里，带虚线和「隐式」标签
- [x] 3.5 非布局插件区：目录里没有的 source 放这里

验证（单测，AC1）。下面的期望值是按运行时 `resolveGroups` 的算法从 `real-config.yaml` 推出来的，不是凭印象写的：

| 槽位 | 期望顺序 |
|---|---|
| header | （空） |
| left | `page-title`(10) → `spacer`(25) → toolbar 组(35)[`search` → `darkmode` → `reader-mode`] → `explorer`(50) |
| right | `graph`(10) → `table-of-contents`(30) → `backlinks`(50) |
| beforeBody | `breadcrumbs`(5) → `article-title`(10) → `note-properties`(15) → `content-meta`(20) |
| afterBody | `comments`(10) |
| footer | `footer`(50) |
| 托盘（已禁用） | `tag-list`、`recent-notes`、`stacked-pages` |
| 非布局插件区 | 包含 `obsidian-plugin-excalidraw` |

注意 `left`：toolbar 组的成员优先级是 20/30/35，但组在 `layout.groups` 里显式写了 `priority: 35`，所以整个组排在 `spacer`(25) 后面。

另外：
- Playwright：删掉某个启用组件的 layout 块后载入，它出现在 manifest 默认槽位，并带虚线和「隐式」标签（AC5）

## 阶段 4：交互

- [x] 4.1 底层函数 `move(id, dir)` / `place(id, pos, index)` 放在 core 里
- [x] 4.2 HTML5 拖拽调用 `place`
- [x] 4.3 卡片上的上移/下移按钮调用 `move`
- [x] 4.4 priority 重排逻辑（开、关两种模式）
- [x] 4.5 拖入组盒子 → 写上 `group`；拖出 → 清掉
- [x] 4.6 aria-live 播报

验证：
- 单测：重排开启时，组内改顺序不会让组盒子在槽位里挪位置
- 单测：重排关闭时，新放进来的卡片 priority 落在相邻两张之间
- Playwright：只用键盘完成一次跨槽位移动，并有 aria-live 播报（AC8）

## 阶段 5：属性面板与 byPageType

- [x] 5.1 属性面板：enabled / position / priority / display / condition / group / groupOptions
- [x] 5.2 `groupOptions` 的布尔项做成三态
- [x] 5.3 禁用双重身份插件时给出警告（AC6）
- [x] 5.4 byPageType 面板：template 下拉 + exclude 输入 + 六个清空复选框
- [x] 5.5 面板上写明「不支持添加组件」；选 `minimal` 时警告会丢掉四个槽位（C6）

验证：
- 单测：勾「清空 right」后，输出的 `positions:` 下有 `right: []`（AC7）
- Playwright：禁用 `table-of-contents` 时出现转换器警告

## 阶段 6：输入输出与收尾

- [x] 6.1 三种来源：内置默认 / 粘贴 / 文件选择，汇入同一个 `load()`
- [x] 6.2 有未生成的改动时切换来源，先在界面内确认
- [x] 6.3 输出弹窗：整份 yaml + diff 折叠区 + 复制（剪贴板 API 不可用时回退到 `execCommand`）
- [x] 6.4 明暗主题切换
- [x] 6.5 手机宽度不出现横向滚动
- [x] 6.6 README：使用说明、只适用 v5、C3 导致的 VS Code 误报说明

验证：
- 单测：同一份配置，粘贴载入和文件选择载入的解析结果完全一致（AC12）
- Playwright：不粘贴、不选文件，打开就显示默认配置的布局，并且能生成（AC11）
- Playwright：断网打开，全部功能可用（AC9）。如果 Playwright 不让打开 `file://`，就改用本地静态服务器跑自动化检查，再手动用 `file://` 打开确认一次
- `node --test tests/core.test.mjs` 全部通过，跳过的测试照实报告

## 验证命令

```bash
node --test tests/core.test.mjs          # core 单测 + AC10 独立解析器校验
```

界面部分用 Playwright 检查，记录在每个阶段的验证项里。

## 回滚点

- 阶段 2 的幂等性测试是硬门槛。不过说明解析器给出的 span 信息不可靠，回到阶段 1 重做，不要在回写阶段打补丁绕过去。
- 本任务不在用户站点目录里做任何改动，所以那边不需要回滚点。

## 审查关口

- 阶段 2 结束：幂等性和定向改动两条测试都通过，再进阶段 3
- 阶段 4 结束：键盘路径必须真的跑一遍，不能只看代码就认为能用
- 阶段 6 结束：所有单测通过、Playwright 检查通过，才算完成

## 实施结果（2026-10-21）

阶段 0–6 已实现。最终核心测试 30/30 通过、零跳过；离线 file:// 浏览器验收通过。完整证据与限制见 `validation.md`。AC3 的单插件最小 diff 仅在关闭自动重排时满足；默认自动重排会修改受影响组件与组的优先级，因此该 PRD 条目保持待用户确认。任务未提交、未推送、未归档，等待用户视觉验收。
