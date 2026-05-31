<p align="center">
  <img src="https://raw.githubusercontent.com/bbjyzzwwy/Claude_round_files_diff/master/logo.png" alt="Logo" width="128" height="128">
</p>


<h1 align="center">Claude Round Files Diff</h1>

<p align="center">
  <strong>每次 Claude Code 对话结束，立刻看到它改了哪些文件。</strong>
</p>

<p align="center">
  <a href="https://github.com/bbjyzzwwy/Claude_round_files_diff/blob/master/README.md">English</a> |
  <a href="https://github.com/bbjyzzwwy/Claude_round_files_diff/blob/master/docs/README.zh-CN.md">中文</a>
</p>

---

## 特点

- **自动检测改动** — 每次 Claude Code 对话结束后，Explorer 面板底部自动列出本轮修改的文件。
- **一键 diff** — 点击任意文件，打开 VS Code 原生 diff 编辑器，清晰对比改动前后。
- **按轮追踪** — 每轮对话只显示本轮改动，不会累积整个 Session 的改动。
- **多端支持** — 同时支持 Claude Code CLI 和 Claude Code VSCode 插件。

## 示例

![Demo](https://raw.githubusercontent.com/bbjyzzwwy/Claude_round_files_diff/master/docs/demo.gif)

## 使用

1. 在 VS Code 中打开任意项目
2. 启动 Claude Code 对话，修改一些文件
3. 每轮对话结束后，Explorer 面板底部的「Claude Code 改动」自动刷新
4. 点击文件查看 diff

---

**许可:** [MIT](https://github.com/bbjyzzwwy/Claude_round_files_diff/blob/master/LICENSE)
