# quartz-layout-editor

Quartz v5 布局配置的可视化编辑器。单文件 HTML，离线可用，拖拽调整组件位置后生成可直接粘回 `quartz.config.yaml` 的配置。

## 要解决的问题

Quartz v5 把布局写在 `quartz.config.yaml` 里：每个提供组件的插件带一个 `layout:` 块，声明 `position`、`priority`、`display`、`condition`、`group`。想挪动一个侧栏组件或调整顺序，得手工算 priority、记住六个槽位的名字，还得避开几个文档里没写的陷阱。

这个编辑器把那份 YAML 画成真实的页面框架，拖一下就改好。

## 状态

规划中。项目用 [Trellis](https://www.npmjs.com/package/@mindfoldhq/trellis) 管理开发流程，规划产物在 `.trellis/tasks/` 下。

## 适用版本

针对 Quartz **v5**（`quartz.config.yaml` + `@quartz-community/*` 插件体系）。v4 的 `quartz.layout.ts` 是完全不同的结构，不适用。
