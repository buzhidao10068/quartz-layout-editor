# quartz-layout-editor

Quartz v5 布局配置的可视化编辑器。单文件 HTML，离线可用，拖拽调整组件位置后生成可直接粘回 `quartz.config.yaml` 的配置。

当前发布版本：**0.5**（Git 标签与 GitHub Release 同名）。下载 Release 附件 `index.html` 即可离线使用。

## 要解决的问题

Quartz v5 把布局写在 `quartz.config.yaml` 里：每个提供组件的插件带一个 `layout:` 块，声明 `position`、`priority`、`display`、`condition`、`group`。想挪动一个侧栏组件或调整顺序，得手工算 priority、记住六个槽位的名字，还得避开几个文档里没写的陷阱。

这个编辑器把那份 YAML 画成真实的页面框架，拖一下就改好。

## 使用

1. 双击 `index.html`，无需安装依赖、启动服务或联网。
2. 默认直接显示官方 Quartz v5 配置。也可以选择本地 YAML 文件，或粘贴完整的 `quartz.config.yaml`；两种输入都只在页面内存中处理。
3. 拖动卡片左上角握柄调整位置与顺序，或用 Tab 导航到槽位菜单；聚焦卡片后可按 Alt+方向上/下键排序，不再显示上下箭头按钮。点击组件名称打开组件属性，在其中设置显示条件、优先级及组内属性；已启用组件不显示分组名称字段。
   设置好后点击「效果预览」，直接查看当前草稿的页面外观；无需先生成或保存配置。
4. 点击「生成配置」，检查行级 diff，再点击「复制完整配置」，手动粘贴回自己的文件。自动复制不可用时按 Ctrl+C。

工具不会自动读取、修改或删除你的 Quartz 文件，也不自动保存配置。切换输入源有未生成的改动时会在页面内确认。

### 长页面操作

- 组件托盘使用单行名称拖动条：绿色为现有组件，中性色为新增完整页脚，黄色为新增 Footer 按钮，红色为新增 Spacer。拖动现有条到布局即可启用，拖动新增条到槽位或组内即可创建实例（取消不创建）；也可点击名称或按 Enter 打开属性。托盘不再展示说明、徽章、排序或下拉框，详细设置统一在组件属性中操作。长名称单行省略，悬停可看完整名称。
- 编辑画布不再为每个组件重复显示分组下拉框；仅保留 toolbar 这类实际分组的统一容器。已启用组件的属性也不显示「分组（group）」字段，加入或移出组请直接拖入／拖出；未启用组件仍保留分组名称入口。组整体配置通过「编辑组」或悬浮条的「分组容器」打开。

The tray uses compact name-only draggable rows: green for existing components, neutral for new full footers, yellow for new Footer buttons, red for new Spacers. Drag existing rows into the layout to enable them, or drag creation rows into a slot/group to create an instance; cancellation creates nothing. Click a name or press Enter for properties. Descriptions and controls live in properties, not the tray; long names truncate with a full-name tooltip.

The layout canvas no longer repeats a group selector on every component. Actual groups such as toolbar keep a single shared container. Enabled components also omit the Group field in properties; drag them into/out of groups to change membership. Disabled components retain the group assignment field. Use Edit group or Group containers for group-wide settings.

Component cards have no up/down buttons. Drag to reorder, use the slot menu to relocate, or focus a canvas card and press Alt+ArrowUp/ArrowDown for keyboard reordering. Priority is also editable in properties.

托盘点击名称只切换到组件属性，**不会自动启用组件**；点击新增 Footer／Spacer 也只创建未启用组件，先配置再勾选「启用组件」或拖入布局。手动勾选启用后，页面会自动定位到该组件的画布／预览位置；当前预览条件下不可见的组件不触发定位。组件属性顶部可直接切换当前组件。主动选择已启用组件或选择分组时，页面也会定位并展开折叠组；禁用组件不会触发定位。普通属性编辑、面板开关不移动页面。五个面板点击整个顶部标题栏（包括右侧 ×）即可收起，也支持键盘 Enter／空格和 Escape。底部悬浮条时页面顶部不再预留空白，顶部悬浮条时仅保留避免遮挡的必要间距。

Clicking a tray name opens properties without enabling the component. Clicking New Footer/Spacer also creates a disabled instance. Configure it, then drag into the layout or check Enable component. Manually enabling locates the component in the current canvas/preview unless preview conditions hide it. The properties selector switches components directly. Explicit selection also locates enabled components or groups and expands collapsed groups; disabled or preview-hidden components do not scroll the page. Routine property edits and panel toggles keep page scroll unchanged. Click anywhere on a panel heading, including ×, or use Enter/Space or Escape to close it. No top blank space is reserved for a bottom dock; a top dock keeps only its required clearance.

- 「编辑布局 / 效果预览」与五个面板入口合并为底部悬浮切换条，滚动到哪里都能使用。点击「移到顶部 ↑」可切换为顶部悬浮条，点击「移到底部 ↓」可恢复；浏览器记住位置偏好，存储被禁用时仍可切换。切换条位置不会更改配置或滚动页面。
- 按住组件左上角握柄拖动时，也可使用鼠标滚轮上下滚动；靠近屏幕上沿或下沿时会自动滚动。移回中间暂停自动滚动，放下或按 Esc 取消即停止。折叠的托盘或画布内分组，拖到标题上稍作停留即可自动展开。
- 组件托盘、当前组件设置（例如「堆叠页面」）、分组容器、页面类型覆盖，以及画布内每个分组，均可点击标题收起或展开，也支持 Tab 后按 Enter / 空格。切换语言和视图保留收起状态与输入草稿，折叠不会更改配置；重新打开页面恢复默认展开状态。
- 项目地址已移到顶部 GitHub 图标，点击在新标签页打开仓库。

The bottom floating bar combines **Edit layout / Draft preview** and all five panel shortcuts. Use **Move to top ↑ / Move to bottom ↓** to change its edge without scrolling or changing YAML. The browser remembers the preference when storage is available. Hold the component grip to drag and use the mouse wheel to scroll, or drag near the top/bottom edge for automatic scrolling; Escape cancels. Pause over a collapsed tray/group heading to expand it. Panel and group headings support mouse and keyboard toggles without changing YAML. Disclosure choices and field drafts survive language/view changes for the current session. The GitHub repository icon is in the top toolbar.

## 中英文切换与新手指南

顶部「界面语言 / Interface language」可切换中文与 English。首次打开按浏览器语言选择；之后记住手动选择。浏览器不允许存储时仍可正常切换。语言选择仅保存偏好，不保存或上传配置。

组件名称、用途、属性、指南、操作提示、错误行号和输出弹窗均支持双语。切换时保留当前配置、改动、选中组件、输入草稿和生成结果；YAML 的英文键与值不会被翻译。

页面顶部默认展开四步指南：载入配置 → 移动和设置组件 → 生成并核对 → 手动应用到网站。可以收起，随时展开。

18 个布局组件都提供中英文名称和用途；中文模式保留英文对照。例如：

- **网站标题（Page Title）**：整个网站的名称，通常可点击返回首页；不是文章标题。网站名称由 `configuration.pageTitle` 控制，本工具不修改该配置。
- **文章标题（Article Title）**：当前文章的标题，通常位于正文上方。
- **文件目录（Explorer）**：树状笔记和文件夹导航。
- **关系图谱（Graph）**：笔记之间的链接关系。
- **文章目录（Table of Contents）**：当前文章内的标题导航。

位置、显示范围、模板、对齐、伸缩等属性提供中文说明，实际 YAML 键和取值仍保留 Quartz 需要的英文。点击组件中文名称可查看详细说明。

## 纯静态部署

编辑器不包含运行中站点预览、站点地址输入或 iframe，不访问本地 Quartz。直接打开 HTML 或作为静态文件部署即可，两种语言均不需要运行时网络请求。生成后请自行备份、粘回配置，并通过原有 Quartz 流程重新构建或重启网站。

## 草稿效果预览

七个入口共用顶部／底部悬浮切换条，默认底部，宽屏横向排列，窄屏自动分行，页面不再为右侧竖条留空。组件托盘、非布局插件、组件属性、分组容器和页面类型覆盖默认全部隐藏，页面中不再保留旧面板或重复标题。点击入口只展开对应悬浮面板：页面布局在下层，面板在上层，不占布局列或行，打开、切换和收起均不会缩窄、下推或滚动画布。底部悬浮条时面板在其上方，顶部悬浮条时面板从其下方开始，自动避让且保留独立滚动。再次点击入口、关闭按钮或按 Escape 收起。需要操作被面板遮住的区域时，先收起面板。选择组件或编辑组也会打开对应面板；切换面板或悬浮条位置不会丢失未提交的输入。

The persistent floating bar includes both views and all five panel shortcuts, defaults to the bottom and can move to the top. Wide screens use a horizontal row, narrow screens wrap into rows; no right-side rail space is reserved. All panels start hidden, with no legacy panels left in the page. Only the requested panel appears as a fixed overlay above the canvas, above a bottom bar or below a top bar without covering it. Panels never take layout space or resize, shift or scroll the underlying canvas when opened, switched or closed. Panels scroll independently. Click the active shortcut, close button, or press Escape to dismiss before interacting with covered content; panel, view and bar-position switches retain drafts.

五个面板分别记住本次会话中的滚动位置，组件属性、分组和页面类型还按当前编辑对象分别记忆；切换面板、收起重开、切换语言或视图不必从头找。载入另一份配置时清空记忆。鼠标在面板内容或标题上滚动，只滚动该面板，到顶或到底不会带动外层页面；在未遮挡的画布上仍可正常滚动页面。面板高度自动避让标题和工具栏，面板开关不改变页面滚动位置。

Panel scroll positions are session-only and separate for each selected component, group and page type. Switching, reopening, changing language or changing view restores the relevant position; loading another config clears the history. Wheel input over a panel or its heading stays within that panel, including at its boundaries. Uncovered canvas scrolling and Ctrl+wheel zoom remain available. Panel height accounts for the heading and dock; panel toggles leave page scroll unchanged.

两种视图共用当前内存中的配置。移动组件、改属性或页面覆盖后，效果立即更新；不会自动写入配置文件。默认「适应可用宽度」显示完整画面，关闭后可按原始尺寸查看并横向滚动。

- 桌面 1440px、平板 1000px、手机 390px，分别使用核对过的 Quartz 5 布局规则，断点为 800px / 1200px。
- 可选择六种页面类型，预览其排除组件、清空槽位和模板覆盖。示例文章条件可控制首页、标签、反向链接及目录，用来检查 `condition`。
- 支持默认、全宽、精简三种框架，以及组件显示范围、优先级、隐式默认位置、分组方向/间距/换行和组内布局属性。
- 打开「标注布局区域」，六个槽位和正文会显示高对比实线框及名称；线框随缩放补偿粗细。预览使用工作区全宽与清晰的系统字体，文字仍小时可取消「适应可用宽度」，按原始尺寸查看。
- 「有标签 / 有反向链接 / 有文章目录」同时控制示例数据和已配置的 `condition`：无标签、无目录时对应内容消失；无反向链接时显示空状态，若配置了 `has-backlinks` 条件则整个组件隐藏。这些开关不会启用已禁用的组件，页面会说明对应组件未显示的情况（默认标签列表禁用）。
- 「组件与配置一一对应」可核对 `source` 短名 → 槽位；点击映射条目可返回对应卡片编辑。

The preview spans the workspace and uses legible system fonts. Region labels include high-contrast, scale-compensated boxes for all slots and the sample body. Tags/backlinks/TOC switches change sample data as well as evaluating configured layout conditions; they do not enable plugins. Missing backlinks show an empty state unless a condition hides the widget. Disabled or otherwise unavailable widgets are explained beside the sample controls.

**对应的是布局，不是执行 Quartz 的真实构建。** 网站标题、文章、日期、图谱、评论等使用示例内容；插件服务、主题、自定义组件、插件 options 没有执行，不承诺像素级复刻。自定义条件按未注册时显示并提示；自定义框架暂用 default 示意并提示，需在自己的站点验证。

## 布局规则

- 六个槽位：`header`、`left`、`beforeBody`、`afterBody`、`right`、`footer`。按照 Quartz 5 `DefaultFrame`：左右侧栏夹住正文列，中列依次为 `header → beforeBody → 正文 → afterBody`；`footer` 在中列下方，不横跨侧栏。手机顺序为左侧栏、正文列、右侧栏、页脚。
- 虚线「隐式布局」表示组件已启用但没有显式 `layout:`，仍按插件 manifest 的默认位置显示。拖到托盘会设置 `enabled: false`，不是删除布局。
- 自动重排优先级默认开启，按可见顺序赋 10、20、30……，因此一次移动可能修改同槽位其他组件和组的优先级。**想尽量减小 diff，请先关闭自动重排**，新位置取相邻优先级的中点。
- 禁用 Table of Contents 或 Note Properties 也会关闭其转换器，界面会提示。页面类型面板只能排除或清空槽位，不能添加组件；`full-width` 不显示左右侧栏；`minimal` 只保留正文和页脚，不显示 `header`、`beforeBody`、`afterBody`、`left`、`right` 五个槽位。
- `groupOptions.grow/shrink` 支持「未设置 / true / false」，显式 false 不会丢失。

## 保留与限制

不编辑配置主题、字体、站点地址或其他插件 options。输出只定向修补启用状态、布局相关块与用户修改的 `footer.options.links`，保留未编辑区域的注释、引号和空行；被改写的布局或 links 块会重新格式化，块内注释可能被替换。

接受 UTF-8 BOM、CRLF、LF 和无末尾换行的输入。输出统一 LF、无 BOM，仅保留末尾是否有换行；粘贴后文件编码与换行由你的编辑器管理。

解析器是针对 Quartz 配置的扫描器，不是通用 YAML 库。布局区域支持两空格缩进、普通映射与字符串列表；不支持对象 source、锚点/别名、复杂 flow mapping 或非空 `byPageType.positions`。遇到不支持的布局结构会拒绝载入，不猜测改写。除页脚 links 外，插件 options 和 configuration 保持不透明、原样保留；不支持的页脚 links 结构只读保留，不阻止布局编辑。

## 自定义按钮组件

每个独立按钮组件只有一个按钮，在组件属性的「按钮设置 · 原生 Footer」直接填写名称与目标（如 `/about`、`/notes/start` 或完整网址），点击「保存按钮」。不提供嵌套按钮；需要另一个独立按钮，请回到组件托盘新增。效果预览使用实际按钮文字；点击预览按钮打开其设置，不跳转目标页面。

**完整页脚也可以创建多个。** 在组件托盘点击或拖动「新增页脚 · Footer」，每个页脚独立启用、移动、分组；新建页脚不显示 Quartz 署名，导入的原版 Footer 保留原生 `Created with Quartz v版本号 © 年份`。在「页脚链接设置」添加、修改、移除多个链接，完成输入并离开输入框后自动保存，不再显示「保存链接」按钮；也可移除全部链接。无效输入保留草稿并显示错误，不会覆盖已保存配置。添加、移除链接时会同时保存当前有效草稿，重复名称或危险地址会阻止操作。导入的多链接页脚现在也可以直接编辑，不会自动拆分或丢弃链接；不支持的 YAML 结构仍保持只读。

新增页脚与独立按钮均采用原生 Footer，导出不包含自定义类型字段；重新导入后统一作为完整页脚编辑。新建页脚和独立按钮的预览及单独导出的 CSS 不显示 Quartz 署名，导入的原版 Footer 保留署名。独立按钮的单按钮限制仅用于当前会话的新建入口。预览署名中的 `v5.0.0` 为示例，实际版本和年份由 Quartz 构建时生成，不会被编辑器改写。

**Repeatable full footers:** click or drag **New footer · Footer** in Component tray. New instances hide the Quartz credit; imported native Footers retain `Created with Quartz vVERSION © YEAR`. Each instance has independent placement, grouping and visibility. Add, edit or remove multiple links in Footer links. Changes save automatically when you leave an input, without a Save links button; invalid input keeps the draft and shows an error without overwriting saved config. Removing all links is supported. Adding/removing a link also saves valid drafts; duplicate labels and unsafe targets reject the operation. Imported multi-link footers are editable without splitting or dropping links; unsupported YAML syntax remains read-only. Independent buttons still have exactly one button when created. Native YAML does not encode this distinction, so reimported instances are edited as full footers. Preview version `v5.0.0` is illustrative; Quartz generates the actual version/year at build time.

**只用原生，不安装外来插件。** 打开悬浮条的「组件托盘」，点击或拖动黄色「新增独立按钮 · Footer」；这里也可重复添加 Spacer。每个独立按钮对应一个原生 Footer 实例，可分别拖到六个槽位，独立启用或隐藏。输出仍为原生 Footer 的 `options.links` 和 `layout`，不生成自定义插件或虚构参数。名称不能为空，禁止危险协议。根路径 `/about` 指向域名根目录；Cloudflare 子目录部署时请包含站点路径前缀，部署后验证目标页面存在。

属性中可选原生链接、简洁文字、描边、实心、胶囊样式。样式通过 Quartz 自带的 `quartz/styles/custom.scss` 实现：生成配置后，**另行复制按钮样式**，追加到已有文件末尾；如已粘贴过本编辑器生成的样式，请替换旧段，不要重复追加。仅粘贴 YAML 不会应用样式。新建页脚和独立按钮会同时导出隐藏 Quartz 署名的 CSS，导入的完整页脚仍保留原生署名。相同目标 URL 的 Footer 按钮共用样式；选择仅保留于当前编辑会话，重新加载 YAML 不会恢复。页面覆盖排除 `footer` 会影响所有实例。用原有 Cloudflare 构建部署流程即可，无需安装插件。本编辑器不会写入你的站点。

「按钮外观」提供文字、本地图片、外链图标三种选择，不再提供内置图标选项。本地 PNG / JPEG / WebP 图片可代替可见文字，最大 1 MiB、2048 × 2048，直接嵌入导出的样式，不请求外部图床；本地上传不支持 SVG。请保留有意义的按钮名称，它仍是无障碍文字。图片、外链图标和样式均为当前会话设置，不写入 YAML，生成时必须同时复制样式；重新载入后需重新选择。新建页脚和独立按钮的导出 CSS 会隐藏 Quartz 署名，导入的完整页脚仍保留署名。

**外链图标**：在组件属性的「按钮外观」选择「外链图标」，填写 HTTPS 图片直链（例如 `https://example.com/icon.svg`），而非图标网站的网页地址。支持浏览器可显示的 PNG、JPEG、WebP、SVG、ICO 等；外链 SVG 仅作为图片显示，不插入页面源码或执行脚本。编辑器不验证远端内容，实际支持情况取决于服务器响应和浏览器。只有主动选择并填写外链时，预览才会请求该图标服务（不发送页面 Referrer）；失败时预览恢复按钮名称。部署后也需要联网，并可能受防盗链或站点 CSP 限制。外链仅写入单独导出的 `custom.scss`，仍须复制样式；YAML 不保存此选择。部署后的 CSS 图片加载失败不会自动恢复文字，请确认图标链接可靠，或改用本地图片。

外链图标模式会提示可到 [Appicons](https://appicons.co) 查找图标；填入的仍须是 HTTPS 图片直链，不是网站首页或详情页地址。该链接只是资源推荐，编辑器不会自动访问或接入其 API。

Button appearance offers text, local images and external icon URLs; the built-in Icon option has been removed. For an external icon, choose **Button appearance → External icon URL** and enter a direct HTTPS image URL, including SVG or ICO. The panel links to [Appicons](https://appicons.co) for finding icons; paste a direct image URL rather than a web page. This is a resource recommendation, not an automatic integration or API request. SVG stays an image, never inline executable markup. Only explicit image opt-in contacts the image host; preview uses no referrer and falls back to the label on failure. The deployed CSS still depends on the host and site CSP and cannot restore text automatically on image failure. Copy the separate `custom.scss` export; YAML does not store appearance. Local images still work offline.

Native only: use the yellow **New button · Footer** strip in Component tray to create independent native Footer instances, one button each, or add repeatable full footers and Spacers. Each instance has its own placement and visibility. New full-footer and independent-button previews hide the Quartz credit; imported native Footers retain it. Independent buttons stay flat; full footers support multiple links. Choose text, external icons or a local PNG/JPEG/WebP image (up to 1 MiB and 2048 × 2048; no SVG), plus native/text/outline/filled/pill styles. Local images embed in CSS without external requests; meaningful link labels remain accessible. Copy the separate stylesheet into the existing `quartz/styles/custom.scss` (replace earlier editor-generated rules), then rebuild/deploy normally. YAML alone cannot apply appearances. Identical target URLs share appearances; choices are session-only and not restored from YAML. No new plugin or unsupported YAML option is introduced.

## 多个占位间隔与组内布局

效果预览中，面板打开时会用醒目的虚线框标出当前选中的组件；关闭面板恢复干净预览，禁用或当前条件下不可见的组件不显示框。选中框不会改变布局或导出配置。新增独立按钮的「保存」与红色「删除」按钮在属性面板底部同一行，左侧保存、右侧删除，等宽排列；新增完整页脚自动保存链接，与 Spacer 一样保留底部全宽删除按钮。删除仅适用于本次新增的组件，导入的组件仍通过禁用控制。

While a panel is open, Draft preview outlines the selected visible component with a scale-compensated dashed box. Closing the panel removes the outline; disabled or hidden selections have no box. Selection does not change layout or YAML. New independent button properties end with one equal-width action row: Save on the left and red Delete on the right. New full footers save links automatically and, like Spacers, keep a full-width Delete button at the bottom. Only newly created instances can be deleted; imported components can still be disabled, not deleted.

组件托盘顶部可重复创建原生 Spacer，每个实例独立设置位置、启用状态、条件及分组。本次新增的实例可以移除；导入的实例仍通过禁用控制。页面类型排除 `spacer` 会影响所有实例。

先将组件加入分组，再设置 `groupOptions`：未分组时不显示整块组内布局及其说明；加入分组后自动显示，移出分组立即隐藏。已启用组件不显示分组名称字段，但保留已有分组关系和组内布局设置；未启用组件仍可通过分组名称入口分配分组。

- `grow`：分配剩余主轴空间，默认否；`shrink`：空间不足时允许收缩，默认是。
- `basis`：初始主轴尺寸，横向是宽度、纵向是高度，支持 `auto`、`160px`、`12rem`、`30%`、`calc(50% - 1rem)` 等；输入非法值不会覆盖有效配置。收缩、扩展或百分比父容器尺寸会影响最终大小。
- `order`：较小数值先显示，支持负数；`align`：交叉轴对齐，可选拉伸。效果预览会应用这些属性。
- `justify`：Quartz 原生输出的是 `justify-self`，浏览器在 Flex 中忽略它；编辑器保留此兼容字段并明确提示，不伪造效果。主轴间距请用分组 `gap`、`grow` 或 Spacer。

Native Spacers are repeatable and independently placed. Group options and their explanations are omitted for ungrouped components. Joining a group reveals the options and leaving hides them. Enabled components omit the group assignment field without changing membership or member options; disabled components retain it. Defaults: grow false, shrink true, basis auto, order 0 and align center. Basis accepts valid CSS sizes and follows the main axis (row width / column height). Preview uses native flex properties. Quartz emits `justify-self`, which has no effect in CSS Flex; use group gap, grow or Spacer instead. Repeated floating-panel edits preserve document scroll while retaining independent panel scroll.

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

验收覆盖断网 `file://`、实际 Tab/键盘移动、握柄拖拽、文件/粘贴等价、diff、剪贴板回退、明暗主题及两种语言的手机布局。另验证语言记忆、浏览器语言回退、存储被禁用、错误翻译、切换语言保留草稿与弹窗、零 iframe 和零 HTTP 请求。项目用 Trellis 管理，记录在 `.trellis/tasks/`。

效果预览另验证源码对应的区域几何、三种框架、断点、条件、页面覆盖、分组样式、适应宽度、移动后即时更新及查看预览不改变 YAML。

## 适用版本

针对 Quartz **v5**（`quartz.config.yaml` + `@quartz-community/*` 插件体系）。v4 的 `quartz.layout.ts` 是完全不同的结构，不适用。

## 致谢 / Acknowledgements

感谢 [Appicons](https://appicons.co) 提供图标查找资源，作为外链图标的推荐入口。图标的授权和使用条件以来源说明为准。

Thanks to [Appicons](https://appicons.co) for the icon discovery resource recommended in external-icon mode. Check each source for its icon licensing and usage terms.
