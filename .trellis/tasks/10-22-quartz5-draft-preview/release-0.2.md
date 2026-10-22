# Quartz Layout Editor 0.2

下载附件 `index.html`，双击即可使用；也可将它作为静态页面部署。无需安装依赖、启动 Quartz 或联网。

## 新增

- **中文 / English i18n**：组件名称、用途、新手指南、属性、错误提示、输出与复制控件完整双语；记住语言偏好，切换不丢失当前编辑草稿或生成结果。
- **四步新手指南**：说明配置输入、组件移动、生成核对和手动应用；解释网站标题（Page Title）与文章标题（Article Title）的区别。
- **离线草稿效果预览**：编辑后无需保存即可查看效果；支持桌面、平板、手机、适应宽度、页面类型、显示条件、分组样式及组件到配置槽位的映射。
- **项目地址**：页脚提供中英文 GitHub 链接。

## 修正

- 按已核对的 Quartz 5 源码修正画布：header 位于正文列顶部，footer 位于正文列底部，不再横跨左右侧栏。
- 正确应用 default / full-width / minimal 框架；minimal 隐藏 header、beforeBody、afterBody、left、right 五个槽位，仅保留正文和页脚。
- 修复输入框失焦重绘可能吞掉按钮点击的问题，保留键盘、拖拽与语言切换状态。

## 预览边界

效果预览与当前布局草稿对应，但不是运行 Quartz 的真实构建。文章、日期、图谱和评论等是示例内容；主题、插件 options、自定义组件和服务不执行，不承诺像素级复刻。自定义条件及框架会提示假设，需在站点自行验证。

不包含运行中站点 iframe 或本地站点地址输入，不自动修改、启动或构建用户站点。配置始终由用户手动复制粘贴。私人配置与测试截图不在仓库或附件内。

## 验证

37 项核心测试通过；中英文离线浏览器、实际布局几何、设备与模板、草稿即时更新、语言记忆、手机布局、零 iframe / HTTP 请求验收通过。

## English

Version 0.2 adds complete Chinese/English i18n, a first-use guide, an offline live-draft layout renderer and the project link. It fixes center-column header/footer placement against the inspected Quartz 5 frame source and correctly handles default/full-width/minimal frames. The preview uses sample content, not an actual Quartz build, and does not run themes, custom components, plugin options or services. Download `index.html` to use the editor offline. No site files are written, uploaded, started or built.
