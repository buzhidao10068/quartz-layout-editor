# 技术设计

## 一、整体形态

单个 `index.html`，三段内嵌：`<style>`、`<body>` 结构、`<script>`。零依赖、零网络请求。

不用构建工具。理由：产物就是一个文件，引入打包器只会在「双击即用」和「改一行就能看到效果」之间加一层。

不引入 js-yaml。理由见第三节 —— 本工具不需要通用 YAML 解析，需要的是**带位置信息的定向提取**，而通用库恰好丢掉位置信息。

## 二、数据模型

```js
state = {
  rawLines: [],        // 载入文本按行切分（已去掉 \r 和开头的 BOM），只读
  source: {            // 配置从哪来，顶栏显示
    kind: "default",   //   "default" 内置默认 | "file" 文件选择 | "paste" 粘贴
    name: "",          //   文件名；粘贴时为空
    loadedAt: null,    //   载入时间
  },
  finalNewline: true,  // 原文件最后有没有换行，输出时保持一致
  dirty: false,        // 是否有未生成的改动，切换模式前用来提示
  entries: [],         // 插件条目，见下
  groups: {},          // layout.groups
  byPageType: {},      // layout.byPageType
  groupsSpan: null,    // layout.groups 在 rawLines 中的行区间
  byPageTypeSpan: null,
  pluginsSpan: null,
  selected: null,      // 当前选中的 entry id
  renumber: true,      // 拖动后自动重排 priority
}
```

每个 entry：

```js
{
  id: 0,               // 数组下标，稳定
  source: "@quartz-community/explorer",
  shortName: "explorer",   // source 末段，去掉 #ref —— exclude 用的就是这个
  span: [161, 165],    // 该条目在 rawLines 中的行区间（含）
  enabledLine: 162,    // enabled: 所在行号，便于定向改写
  enabled: true,
  layout: {            // null 表示无 layout 块
    position: "left",
    priority: 50,
    display: undefined,
    condition: undefined,
    group: undefined,
    groupOptions: undefined,
  },
  layoutSpan: [163, 165],  // layout 块的行区间，null 表示不存在
  catalog: { ... },    // 来自内置组件目录，见第四节
}
```

`span` 是整个设计的关键：输出阶段靠它做定向替换，不碰区间外的任何字节。

## 三、YAML 处理策略

### 为什么不用通用解析器

通用库的工作方式是「文本 → 对象 → 文本」。第二步会丢掉注释、引号风格、键顺序、空行。本配置里有需要保住的东西：

- 首行 `# yaml-language-server: $schema=...`（给 VS Code 用）
- 颜色值的引号风格（`"#faf8f8"` 带引号，`rgba(...)` 不带）
- 用户手写的注释和分组空行

round-trip 之后这些全变样，用户会看到一份「哪里都改了」的 diff，无法确认工具只动了该动的地方。违反 R6.1 和 AC2。

### 载入：三条路径，一个入口

```
内置默认 ─┐
文件选择 ─┼─→ load(text, source) ─→ normalize ─→ 解析 ─→ state
粘贴     ─┘
```

- **内置默认**：官方配置嵌在 `<script type="text/plain" id="default-config">` 里，读 `textContent`。HTML 解析器会保留开始标签后面那个换行，所以要去掉开头的一个 `\n`，否则第一行会变成空行。
- **文件选择**：`file.text()` 按 UTF-8 解码。
- **粘贴**：读弹窗里 `<textarea>` 的 `value`。浏览器会把 textarea 里的 CRLF 规范化成 LF，所以粘贴模式拿不到原文件的换行风格。这不影响使用，原因见 PRD R1.6。

`normalize(text)`：

1. 去掉开头的 `﻿`（`file.text()` 会自己去掉，这一步是防御性的）
2. 记下 `finalNewline = /\r?\n$/.test(text)`
3. 按 `/\r?\n/` 切行；有末尾换行时，丢掉切出来的最后一个空串

输出：`lines.join("\n") + (finalNewline ? "\n" : "")`。统一 LF、不带 BOM。

切换来源前若 `state.dirty` 为真，先在界面内确认再丢弃改动（用行内确认，不用 `confirm()`，见 spec 的 Forbidden patterns）。

### 实际方案：扫描式提取 + 定向回写

**解析（只做本配置用到的语法子集）**

1. 按行切分，逐行判断顶层键（`^[a-zA-Z$]` 开头且无缩进）→ 得到 `configuration` / `plugins` / `layout` 三段的行区间
2. 在 `plugins` 区间内，`^  - ` 开头的行是条目起点，下一个起点或区间结束是终点 → 得到每个 entry 的 `span`
3. 在 entry 区间内扫 `^    (source|enabled|order|options|layout):`，记行号。`layout:` 的子键再往下扫 `^      (position|priority|display|condition|group|groupOptions):`
4. `layout` 顶层段内解析 `groups` 和 `byPageType`，结构较深但形状固定，按缩进层级递归

缩进约定（本配置一致遵守，解析器据此工作）：条目 `  - `，条目属性 `    `，二级 `      `，三级 `        `。

**回写**

```
输出 = rawLines 的拷贝，逐 entry 应用补丁，然后替换 layout 段
```

每个 entry 的补丁只有三种：

| 情况 | 操作 |
|---|---|
| `enabled` 变了 | 替换 `enabledLine` 那一行 |
| `layout` 内容变了，原本有 `layoutSpan` | 用新生成的块替换该区间 |
| `layout` 从无到有 | 在条目末尾插入新块 |
| `layout` 从有到无 | 删除 `layoutSpan` 区间 |

补丁从后往前应用（行号大的先做），避免前面的增删影响后面的行号。这是整个回写逻辑里最容易出错的地方，`implement.md` 里单列一个验证步骤。

`layout` 顶层段整体重新生成 —— 它结构深、改动频繁，逐行补丁的复杂度不划算；而且它内容较少，重新生成的 diff 可读。

### diff 生成

拿 `rawLines` 和输出行数组做最长公共子序列，输出 `{type: 'same'|'add'|'del', lineNo, text}` 列表，折叠区只渲染 add/del 及其上下各 2 行上下文。LCS 在几百行规模上无性能问题，自己写十几行即可。

## 四、组件目录

18 个可放置组件的清单（source、显示名、defaultPosition、defaultPriority、category）内嵌为常量。

数据来源：`node_modules/@quartz-community/*/package.json` 的 `quartz.components` 字段，已扫描提取。**不手写猜测**，原因是 C5（名字错了运行时静默跳过，用户看不到任何报错）。

`encrypted-pages` 提供组件但无 `defaultPosition`，不可放置，不入清单。

目录同时标注 category，用于 R4.3 的双重身份警告：`table-of-contents`（transformer,component）、`note-properties`（transformer,component）。

对于导入的配置里出现、但目录中没有的插件 source：保留其配置原样，在「非布局插件」区列出，只给 `enabled` 开关。这样第三方插件不会因为工具不认识就被丢掉。

## 五、渲染与交互

### 槽位几何

按 `DefaultFrame.tsx` 的真实结构画：

```
grid-template-areas:
  "fh fh fh"      header 横跨
  "fl fc fr"      left | center | right
  "ff ff ff"      footer 横跨
```

center 内纵向排 `beforeBody` → `pageBody`（固定、不可放置）→ `afterBody`。列宽 `1fr 2.1fr 1fr` 接近 Quartz 实际的侧栏/正文比例。

### 槽位内的渲染顺序

必须复刻运行时的 `resolveGroups` 逻辑，否则预览会骗人：

1. 收集该槽位所有 entry：显式条目先入列，隐式条目后入列，再按 priority 升序稳定排序。所以 priority 相同时显式的排在前面，这和运行时两轮循环的顺序一致
2. 带 `group` 的，首次遇到时在该位置插入一个「组盒子」，有效优先级取 `groups[g].priority ?? 该成员的 priority`
3. 组内成员按各自 priority 升序
4. 组盒子与散装组件混在一起，按有效优先级再排一次

隐式放置的 entry（`enabled: true` 且无 `layout`）也要参与：按 manifest 的 defaultPosition / defaultPriority 加入，视觉上标为虚线。这是 R4.1 的 UI 诚实性要求 —— 不画出来，C1 就在界面上变成一个谎。注意运行时对隐式条目不应用 display / condition / group，预览也不应用。

载入的配置里若有 `position` 不在六个合法值之内（典型是 `body`：过时的 JSON schema 会在 VS Code 里自动补全它），运行时会静默丢掉这个组件。这类条目放进托盘并标警告「position: body 不是有效槽位，运行时会静默丢弃」，不要假装它在某个槽位里。

### 拖拽

HTML5 原生 `draggable` + `dragover` / `drop`。插入位置按指针 Y 坐标与各卡片中线比较得出。

键盘路径完全独立于拖拽：卡片上的上移/下移按钮操作同一套 `move(id, dir)`，属性面板的 position 下拉操作同一套 `place(id, pos, index)`。两条路径共用底层函数，不存在「拖拽能做、键盘做不到」的操作。

### priority 重排

开启时，对受影响槽位的渲染条目（散装组件或组盒子）按可见顺序赋 10, 20, 30...；组内成员独立赋值。组盒子的 priority 显式写入 `groups[g].priority`，避免「改成员顺序意外挪动整个组」。

关闭时，新放入的卡片取相邻两张卡片 priority 的中点；若落在首/末，取 `首-10` / `末+10`。

## 六、无障碍

- 卡片 `tabindex="0"`，Enter/Space 选中
- 上移/下移按钮有 `aria-label`，包含组件名和方向
- 槽位用 `role="group"` + `aria-label`
- 移动后 aria-live 播报「<组件> 已移至 <槽位> 第 <n> 位」
- 焦点可见样式用 `:focus-visible`，不依赖颜色单独传达状态（禁用/隐式两种状态同时用边框样式和文字标签区分）

## 七、主题

CSS 自定义属性定义在 `:root`，暗色在 `@media (prefers-color-scheme: dark)` 下用 `:root:not([data-theme="light"])` 守卫重定义，再在 `:root[data-theme="dark"]` 重复一次，支持手动覆盖。配色取 Quartz 默认主题的值，让编辑器看起来像在编辑 Quartz。

## 八、兼容性与回滚

- 工具是只读消费者：它从不写用户的 `quartz.config.yaml`，只输出文本让用户自己粘。误操作的后果上限是「粘了一份不想要的配置」，git 可回滚。
- 解析失败时（遇到不认识的语法）：不静默降级，明确报错并指出行号，拒绝进入编辑态。宁可不能用，不要生成错配置。
- 若导入的配置里 `plugins` 段缺失或为空，视为解析失败。

## 九、可测试性

### 脚本拆成两块

```html
<script id="core">  纯逻辑：组件目录、normalize、解析、回写、diff、槽位排序
<script>            界面：渲染、拖拽、事件
```

`core` 里不允许出现 `document`、`window`、`localStorage`。这样测试能在 Node 里用 `vm` 直接执行这段源码、拿到里面的函数，不需要浏览器，也不需要装任何依赖。

### 三层测试

| 层 | 工具 | 测什么 | 对应 AC |
|---|---|---|---|
| core 单元测试 | `node --test`（Node 24 自带） | 解析断言、幂等性、定向改动、槽位排序 | AC1–AC4、AC12 |
| 独立解析器校验 | Python + PyYAML 6.0.3（本机已装） | 输出能被另一个解析器读懂；只有被编辑的路径变了；取值符合 `types.ts` | AC10 |
| 界面检查 | Playwright 浏览器自动化 | 托盘两种状态、键盘路径、明暗主题、手机宽度、断网打开 | AC5–AC9、AC11 |

AC10 的流程：Node 测试用 core 施加一组已知改动 → 输出写进临时文件 → 调 `tests/yaml_paths_diff.py` 列出输入和输出之间变化的 YAML 路径 → 断言它等于预期集合。

测试脚本放 `tests/`，只是开发工具，不进产物，不违反「产物零依赖」。

### 测试夹具

| 文件 | 来源 | 进不进仓库 |
|---|---|---|
| `fixtures/default-config.yaml` | Quartz v5 官方 `quartz.config.default.yaml` | 进（公开内容） |
| `fixtures/local/real-config.yaml` | 用户站点配置的只读副本 | 不进（`.gitignore`），因为含 giscus ID 和 baseUrl |

CRLF、带 BOM、无末尾换行三种变体由测试在运行时从上面两份生成，不另存文件。

`fixtures/local/` 不存在时（比如别人 clone 了这个仓库），依赖它的测试标记为跳过，而不是失败。

### 用户站点目录只读

`H:\learn\github\buzhidao10068\Quartz` 允许读和复制，不允许修改、删除，不允许在里面执行 git、npm、npx。复制真实配置是唯一需要碰它的地方，只做一次。
