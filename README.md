# quartz-layout-editor

Quartz v5 布局配置的可视化编辑器。单文件 HTML，离线可用，拖拽调整组件位置后生成可直接粘回 `quartz.config.yaml` 的配置。

当前发布版本：**0.1**（Git 标签与 GitHub Release 同名）。下载 Release 附件 `index.html` 即可离线使用。

## 要解决的问题

Quartz v5 把布局写在 `quartz.config.yaml` 里：每个提供组件的插件带一个 `layout:` 块，声明 `position`、`priority`、`display`、`condition`、`group`。想挪动一个侧栏组件或调整顺序，得手工算 priority、记住六个槽位的名字，还得避开几个文档里没写的陷阱。

这个编辑器把那份 YAML 画成真实的页面框架，拖一下就改好。

## 使用

1. 双击 `index.html`，无需安装依赖、启动服务或联网。
2. 默认直接显示官方 Quartz v5 配置。也可以选择本地 YAML 文件，或粘贴完整的 `quartz.config.yaml`；两种输入都只在页面内存中处理。
3. 拖动卡片左上角握柄调整位置与顺序，或用 Tab 导航到上移/下移按钮、槽位和分组菜单。选中卡片可编辑显示条件、优先级及组内属性。
4. 点击「生成配置」，检查行级 diff，再点击「复制完整配置」，手动粘贴回自己的文件。自动复制不可用时按 Ctrl+C。

工具不会自动读取、修改或删除你的 Quartz 文件，也不自动保存配置。切换输入源有未生成的改动时会在页面内确认。

## 布局规则

- 六个槽位：`header`、`left`、`beforeBody`、`afterBody`、`right`、`footer`。中间正文不可放置组件，画布仅为布局示意，不是真实 Quartz 预览。
- 虚线「隐式布局」表示组件已启用但没有显式 `layout:`，仍按插件 manifest 的默认位置显示。拖到托盘会设置 `enabled: false`，不是删除布局。
- 自动重排优先级默认开启，按可见顺序赋 10、20、30……，因此一次移动可能修改同槽位其他组件和组的优先级。**想尽量减小 diff，请先关闭自动重排**，新位置取相邻优先级的中点。
- 禁用 Table of Contents 或 Note Properties 也会关闭其转换器，界面会提示。页面类型面板只能排除或清空槽位，不能添加组件；`minimal` 模板不会显示四个非正文/页脚槽位。
- `groupOptions.grow/shrink` 支持「未设置 / true / false」，显式 false 不会丢失。

## 保留与限制

不编辑配置主题、字体、站点地址或插件 options。输出只定向修补启用状态与布局相关块，保留未编辑区域的注释、引号和空行；被改写的布局块会重新格式化，块内注释可能被替换。

接受 UTF-8 BOM、CRLF、LF 和无末尾换行的输入。输出统一 LF、无 BOM，仅保留末尾是否有换行；粘贴后文件编码与换行由你的编辑器管理。

解析器是针对 Quartz 配置的扫描器，不是通用 YAML 库。布局区域支持两空格缩进、普通映射与字符串列表；不支持对象 source、锚点/别名、复杂 flow mapping 或非空 `byPageType.positions`。遇到不支持的结构会拒绝载入，不猜测改写。插件 options 和 configuration 保持不透明、原样保留。

组件目录为 18 个官方布局组件的 manifest 快照，不会联网发现新插件。未知插件保留在非布局列表。内置默认配置是公开的官方快照，不包含任何个人站点配置。

Quartz v5 自带 JSON schema 有过时的槽位定义：VS Code 可能建议 `body` 或对 `groupOptions` 报错。合法布局槽位以运行时类型为准，不要把组件放到 `body`。导入非法 position 时工具会将卡片放在托盘并显示警告，便于修正。

## 验证

核心测试需要 Node.js 24 及 Python + PyYAML，无构建步骤：

```powershell
node --test tests/core.test.mjs
```

Windows Node 24 不接受 `node --test tests/` 作为目录入口，使用上面的明确文件路径。测试包含独立 PyYAML 解析与语义路径差异校验。`fixtures/local/` 不进 Git；缺少私人夹具时仅跳过相关测试。

浏览器验收使用现有 Playwright 和本机 Edge，不属于运行时依赖：

```powershell
$env:PLAYWRIGHT_MODULE = 'C:/path/to/playwright/index.js'
$env:BROWSER_EXECUTABLE = 'C:/path/to/msedge.exe'
node tests/browser-check.mjs
```

验收覆盖断网 `file://`、实际 Tab/键盘移动、握柄拖拽、文件/粘贴等价、diff、剪贴板回退、明暗主题及手机无横向滚动。项目用 Trellis 管理，实施与验证记录在 `.trellis/tasks/`。

## 适用版本

针对 Quartz **v5**（`quartz.config.yaml` + `@quartz-community/*` 插件体系）。v4 的 `quartz.layout.ts` 是完全不同的结构，不适用。
