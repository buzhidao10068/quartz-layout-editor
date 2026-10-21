# Quartz Layout Editor 0.1

首个可用版本。下载附件 `index.html` 后双击打开，无需安装依赖、启动服务或联网。

## 功能

- 内置 Quartz v5 官方默认配置，也支持选择文件或粘贴完整 YAML。
- 六槽位布局画布，支持握柄拖拽、键盘上下移动及跨槽位/分组调整。
- 编辑启用状态、布局属性、三态 groupOptions 和页面类型排除/清空。
- 生成整份配置、查看行级 diff、复制到剪贴板。
- 明暗主题、手机布局、隐式组件和转换器禁用警告。

## 验证

30 项核心测试通过，离线 file:// 浏览器验收通过；生成 YAML 使用独立 PyYAML 解析及语义路径校验。用户真实 Quartz 站点未修改，个人配置不包含在仓库或附件中。

## 已知限制

- 仅适用于 Quartz v5，不支持 v4 的 quartz.layout.ts。
- 自动重排优先级默认开启，会改写受影响邻居和组的优先级；需要单插件最小 diff 时先关闭该开关。
- 不支持对象 source、锚点/别名、复杂布局 flow mapping 或非空 byPageType.positions；改写的布局块内注释可能被替换。
- 本版本来自 feat/layout-editor；未合并到 main。
