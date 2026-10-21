# Quartz 布局可视化编辑器

## Goal

单文件离线 HTML：拖拽编辑 Quartz v5 的六个布局槽位，输出整份 quartz.config.yaml 加行级 diff。

## 背景

Quartz v5 把页面布局写在 `quartz.config.yaml` 里。每个提供组件的插件带一个 `layout:` 块，声明 `position` / `priority` / `display` / `condition` / `group` / `groupOptions`。要挪动一个侧栏组件或调顺序，用户得手工算 priority、记住六个槽位名，还要避开几个文档里没写的运行时行为（见 Constraints）。

本工具把那份 YAML 画成真实页面框架，拖一下改好，再生成可粘回去的配置。

## Requirements

### R1 配置输入

- R1.1 模式一「用我的配置」：把本地 `quartz.config.yaml` 的内容粘贴进来，或用文件选择器选中。两种方式等价，都只在浏览器内存里读取。顶栏显示来源（文件名或「粘贴」）和载入时间。
- R1.2 模式二「从默认配置开始」：内置官方 `quartz.config.default.yaml`（Quartz v5），打开即可编辑。顶栏标注「Quartz 默认配置（内置快照）」。不内置用户的个人配置，因为仓库是公开的，而个人配置里有 giscus 的 repoId / categoryId 和站点 baseUrl。
- R1.3 不实现自动读取同目录 yaml —— 页面以 `file://` 打开，CORS 不允许。这是平台限制，不是取舍。
- R1.4 **只读原则**：工具不接触任何 Quartz 项目目录。输入只来自用户主动粘贴/选择的内容或内置默认配置；输出只有屏幕上的文本和剪贴板。
- R1.5 两种模式随时可切换。切换时若有未生成的改动，先提示会丢失。
- R1.6 能正确载入 CRLF 换行、带 UTF-8 BOM、无末尾换行的文件。`\r` 和开头的 BOM 不能混进解析出来的值里：否则 `enabled: true\r` 会被当成字符串而不是布尔值，`﻿configuration:` 会认不出顶层键。输出经剪贴板交给用户的编辑器，换行风格和编码由编辑器按文件自身的设置处理，所以输出统一用 LF、不带 BOM（带上反而会把一个不可见的 U+FEFF 字符粘进文件）；只保留原文件末尾有没有换行。

### R2 布局编辑

- R2.1 按 Quartz `DefaultFrame` 的真实几何渲染六个槽位：`header`、`left`、`beforeBody`、`afterBody`、`right`、`footer`，中间固定显示不可放置的 `pageBody`。
- R2.2 组件卡片可在槽位之间拖动，也可在槽位内拖动改顺序。
- R2.3 键盘可达：每张卡片提供上移/下移按钮和槽位下拉选择，不依赖拖拽。操作结果通过 aria-live 播报。
- R2.4 拖动后按可见顺序重排 priority（步长 10），可开关。关闭时为新放入的卡片取相邻值的中点。
- R2.5 组（group）渲染为槽位内的子容器。拖入即赋 `group`，拖出即清除。组的有效优先级按运行时规则取 `groups[x].priority ?? 首个成员的 priority`；重排时显式写出组的 priority，避免隐式漂移。

### R3 组件属性编辑

- R3.1 选中卡片后可编辑：`enabled`、`position`、`priority`、`display`（all / mobile-only / desktop-only）、`condition`、`group`、`groupOptions`（grow / shrink / basis / order / align / justify）。
- R3.2 `condition` 提供四个内置值的下拉（`not-index` / `has-tags` / `has-backlinks` / `has-toc`），同时允许填自定义值（运行时允许注册，写错只会 warn 并变成无条件显示）。
- R3.3 `groupOptions` 的布尔项用三态（未设置 / true / false）—— `shrink: false` 是有意义的显式设置，不等于未设置。

### R4 托盘与禁用

- R4.1 两种「没有显式布局」的状态必须一眼可区分：
  - `enabled: false` 的：放在左侧托盘，灰显
  - `enabled: true` 但没有 `layout:` 块的：运行时会按 manifest 的默认位置把它放上页面（C1），所以它画在那个默认槽位里，用虚线边框加「隐式」标签标出。拖动它就会写出显式的 `layout:` 块
- R4.2 从槽位拖到托盘映射为 `enabled: false`，不是删除 `layout:` 块（原因见 C1）。
- R4.3 对双重身份插件（`table-of-contents`、`note-properties`）禁用时显示警告，说明会连带关掉转换器，但不阻止操作。

### R5 byPageType

- R5.1 支持六个页面类型：`404` / `content` / `folder` / `tag` / `canvas` / `bases`。
- R5.2 每个类型可编辑三项：`template`（default / full-width / minimal）、`exclude`（短名列表）、清空槽位（六个复选框，勾选输出空数组）。
- R5.3 面板必须写明"此处不支持添加或重排组件，只能清空和排除"，原因见 C2。

### R6 输出

- R6.1 生成整份 `quartz.config.yaml`，采用逐行修补策略：只重写 `enabled:` 和 `layout:` 相关行，其余字节原样保留（注释、引号风格、`# yaml-language-server` 行、颜色值引号）。
- R6.2 同时提供行级 diff 折叠区，显示每一处改动的前后对比，供用户确认未误伤。
- R6.3 一键复制整份配置。剪贴板 API 不可用时回退到选中 + `execCommand`。

### R7 工程约束

- R7.1 单文件 HTML，零外部依赖，零网络请求。双击即用。
- R7.2 自带 YAML 子集解析与回写，不引入 js-yaml。只需覆盖本配置实际使用的语法（块式映射、2 空格缩进、列表、标量、引号串）。
- R7.3 明暗主题跟随系统，可手动切换。
- R7.4 手机宽度下不横向滚动（虽然主场景是桌面）。

## Constraints

这些是运行时的实际行为，从 `quartz/plugins/loader/` 源码确认，不是文档内容。它们直接约束了上面若干需求的形态。

- **C1 删掉 `layout:` 块不等于移除组件。** `config-loader.ts` 的 `buildLayoutForEntries` 有第二轮循环：`enabled: true` 且无 `layout:` 的插件会按自己 manifest 的 `defaultPosition` / `defaultPriority ?? 50` 被隐式放置。→ 约束 R4.1、R4.2
- **C2 `byPageType.positions` 只能清空，不能添加。** 只有 `Array.isArray(x) && x.length === 0` 生效；非空数组被静默忽略。→ 约束 R5.2、R5.3
- **C3 自带 JSON schema 过时且运行时不校验。** `quartz-plugins.schema.json` 的 position enum 漏了 `header`/`footer`、多了不存在的 `body`；`configuration.theme` 是 `additionalProperties: false` 且无 `logo`，但实际配置用 `theme.logo` 能正常构建。真实类型在 `quartz/plugins/loader/types.ts`。→ 工具以 TS 类型为准；输出可能在 VS Code 里被 YAML 插件误报红线，README 需说明
- **C4 双重身份插件禁用会连带废掉转换器。** `table-of-contents`、`note-properties` 的 category 是 `transformer,component`。→ 约束 R4.3
- **C5 写错不报错。** 组件注册名查找顺序 `name` → `source/name` → kebab 转 PascalCase，全失败就 `continue`，无任何输出。→ 工具的组件清单必须来自 manifest 而非手写，避免生成查找不到的名字
- **C6 `template: minimal` 吃掉四个槽位。** `MinimalFrame` 只接 `componentData / pageBody / footer`。→ R5.2 选中 minimal 时需警告

## Acceptance Criteria

- [x] AC1 载入用户真实配置（312 行、46 个插件条目）后，六个槽位的卡片位置和顺序与运行时实际渲染一致
- [x] AC2 不做任何改动直接生成，diff 为空。LF、CRLF、带 BOM、无末尾换行四种输入都要满足；其中 LF 且不带 BOM 的输入，输出必须逐字节相同
- [ ] AC3 把一个组件从 `right` 拖到 `left` 后，输出的 diff 只包含该插件 `layout:` 块内的行，不波及其他插件条目
- [x] AC4 启用一个原本 `enabled: false` 的组件并放入槽位，输出同时正确改写 `enabled:` 和新增 `layout:` 块，缩进与周围条目一致
- [x] AC5 已禁用的组件出现在托盘并灰显；删掉某个启用组件的 `layout:` 块后载入，它出现在 manifest 默认槽位，带虚线和「隐式」标签
- [x] AC6 禁用 `table-of-contents` 时出现转换器连带影响的警告
- [x] AC7 byPageType 面板勾选「清空 right」后，输出 `positions:` 下出现 `right: []`
- [x] AC8 全程不用鼠标也能完成一次跨槽位移动（Tab 导航 + 按钮操作），且有 aria-live 播报
- [x] AC9 断网 + 本地 `file://` 打开，全部功能可用
- [x] AC10 生成的配置交给一个独立的 YAML 解析器检查（不用本工具自己的解析器）：能正常解析；与输入相比，只有被编辑的路径发生变化；所有 layout 字段的取值都在 `quartz/plugins/loader/types.ts` 的真实类型范围内。整个验证过程不修改、不删除 Quartz 站点目录里的任何文件，也不在其中执行 git、npm、npx
- [x] AC11 不粘贴、不选文件，直接打开就显示 Quartz 默认配置的布局，可以编辑并生成
- [x] AC12 同一份配置，粘贴载入与文件选择载入的解析结果完全一致

## 非目标

- 不编辑 `configuration` 段（主题色、字体、baseUrl 等）—— 本工具只管布局
- 不编辑插件的 `options`（giscus 配置、syntax highlighting 主题等）
- 不支持 Quartz v4 的 `quartz.layout.ts`，那是完全不同的结构
- 不做实时预览 Quartz 的真实渲染，只做槽位的几何示意
- 不在任何 Quartz 项目目录里写文件、删文件、跑 git 或构建命令。需要真实构建验证时，在临时目录另外 clone 一份 Quartz（本任务默认不做）

## 验证补充（2026-10-21）

已勾选项有 core 或离线浏览器自动验收证据，详见 `validation.md`。AC3 在「关闭自动重排优先级」时验证通过；开启时 R2.4 要求重排邻居优先级，与 AC3 无条件的单插件 diff 要求冲突，因此保留未勾选，待用户确认该开关条件。未更改其原始验收文字。
