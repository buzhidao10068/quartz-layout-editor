# Quartz 布局可视化编辑器

## Goal

单文件离线 HTML：拖拽编辑 Quartz v5 的六个布局槽位，输出整份 quartz.config.yaml 加行级 diff。

## 背景

Quartz v5 把页面布局写在 `quartz.config.yaml` 里。每个提供组件的插件带一个 `layout:` 块，声明 `position` / `priority` / `display` / `condition` / `group` / `groupOptions`。要挪动一个侧栏组件或调顺序，用户得手工算 priority、记住六个槽位名，还要避开几个文档里没写的运行时行为（见 Constraints）。

本工具把那份 YAML 画成真实页面框架，拖一下改好，再生成可粘回去的配置。

## Requirements

### R1 配置输入

- R1.1 主路径：文件选择器导入 `quartz.config.yaml`。顶栏显示文件名 + 导入时间，让"这是哪一刻的快照"可见。
- R1.2 兜底路径：内嵌一份示例配置，打开即可试用，但 UI 必须明确标注它是演示数据而非用户的真实配置。
- R1.3 不实现自动读取同目录 yaml —— 页面以 `file://` 打开，CORS 不允许。这是平台限制，不是取舍。

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

- R4.1 左侧托盘承载两类卡片，视觉上必须可区分：
  - 真正 `enabled: false` 的（灰显）
  - `enabled: true` 但无 `layout:` 块、正在被隐式放置的（虚线边框 + 警告色）
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

- [ ] AC1 导入项目实际的 `quartz.config.yaml`（313 行）后，六个槽位的卡片位置和顺序与运行时实际渲染一致
- [ ] AC2 不做任何改动直接生成，输出与输入逐字节相同（空操作不产生 diff）
- [ ] AC3 把一个组件从 `right` 拖到 `left` 后，输出的 diff 只包含该插件 `layout:` 块内的行，不波及其他插件条目
- [ ] AC4 启用一个原本 `enabled: false` 的组件并放入槽位，输出同时正确改写 `enabled:` 和新增 `layout:` 块，缩进与周围条目一致
- [ ] AC5 托盘能用肉眼区分「已禁用」与「隐式放置中」两种状态
- [ ] AC6 禁用 `table-of-contents` 时出现转换器连带影响的警告
- [ ] AC7 byPageType 面板勾选「清空 right」后，输出 `positions:` 下出现 `right: []`
- [ ] AC8 全程不用鼠标也能完成一次跨槽位移动（Tab 导航 + 按钮操作），且有 aria-live 播报
- [ ] AC9 断网 + 本地 `file://` 打开，全部功能可用
- [ ] AC10 生成的配置粘回项目后 `npx quartz build` 成功，且页面布局与编辑器预览一致

## 非目标

- 不编辑 `configuration` 段（主题色、字体、baseUrl 等）—— 本工具只管布局
- 不编辑插件的 `options`（giscus 配置、syntax highlighting 主题等）
- 不支持 Quartz v4 的 `quartz.layout.ts`，那是完全不同的结构
- 不做实时预览 Quartz 的真实渲染，只做槽位的几何示意
