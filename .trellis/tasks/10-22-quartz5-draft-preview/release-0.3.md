# Quartz Layout Editor 0.3

## 更新内容

- **顶部／底部悬浮切换条**：编辑布局、效果预览及五个面板入口合并为默认底部悬浮条，可一键移到顶部并记住位置。宽屏横向排列，手机自动分行。
- **悬浮面板与独立滚动**：五个面板默认隐藏，仅按需打开一个；面板浮在画布上方，不挤占布局，不改变页面滚动位置。支持关闭、Escape、焦点返回，移除面板标题的下三角。
- **滚动记忆**：面板、组件、分组和页面类型分别记住本次会话中的滚动位置。面板标题和内容上的滚轮均只滚动面板，到顶或到底不带动页面。
- **拖拽长页面更顺畅**：按住握柄时可用鼠标滚轮滚动，靠近屏幕边缘自动滚动；支持悬停展开折叠分组、取消和键盘移动。
- **效果预览更清晰**：高对比布局区域线框、缩放补偿及更清晰的字体；标签、反向链接、文章目录开关同时反映示例内容和条件判断，并说明未显示的组件。
- **原生自定义按钮**：使用 Quartz 原生 Footer 的 `options.links` 添加、编辑、排序或删除链接。可创建多个 Footer 实例，独立放在不同槽位；样式可预览并单独导出为 `custom.scss`，无需外来插件。
- **界面修复与默认链接**：修复效果预览中组件属性操作导致的空白选中面板；顶部使用 GitHub 图标。内置 Footer 特殊子组件仅保留项目 GitHub 链接，移除默认 Discord，不改动导入配置中的自定义链接。
- 保留完整中英文、离线使用、键盘操作及配置最小范围修改；更新说明和回归测试。

## 下载与部署

- 下载本 Release 附件 **`index.html`**，双击即可离线使用，无需安装依赖。
- 仍是纯静态 HTML，可部署至 Cloudflare Pages；已有 Git 集成可由 `main` 更新触发原有部署流程。此发布操作本身不会创建或修改 Cloudflare 项目。
- 预览使用示例内容，不运行 Quartz 构建、主题或插件服务。生成 YAML 后请自行应用到站点；按钮样式需要另行复制到站点的 `custom.scss`。
- 工具不会自动读取、修改、构建或上传你的 Quartz 站点。

## English

Version 0.3 combines both views and five panel shortcuts into a bottom floating bar that can move to the top and remembers its position. Panels open only on demand, overlay the unchanged canvas, scroll independently and retain per-context scroll positions. Long-page dragging supports the mouse wheel and edge scrolling. Draft previews gain clearer region outlines, typography and sample-condition feedback.

Custom buttons use native Quartz Footer links, with multiple independently positioned Footer instances and optional separate `custom.scss` export—no third-party plugins. Bundled Footer defaults contain only the project GitHub link; imported links remain unchanged. Chinese/English UI, offline operation and keyboard workflows remain available. Download `index.html` for offline use or static hosting, including Cloudflare Pages. No Quartz site files are automatically changed or built.
