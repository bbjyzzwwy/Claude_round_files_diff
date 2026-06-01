<p align="center">
  <img src="https://raw.githubusercontent.com/bbjyzzwwy/Claude_round_files_diff/master/logo.png" alt="Logo" width="128" height="128">
</p>

<h1 align="center">Claude Round Files Diff</h1>

<p align="center">
  <strong>See exactly what files Claude Code changed — after every conversation.</strong>
</p>

<p align="center">
  <a href="https://github.com/bbjyzzwwy/Claude_round_files_diff/blob/master/README.md">English</a> |
  <a href="https://github.com/bbjyzzwwy/Claude_round_files_diff/blob/master/docs/README.zh-CN.md">中文</a>
</p>

---

## Feature

- **Auto-detect changed files** — After each round, a list of every file Claude edited appears in the Explorer panel.
- **One-click diff** — Click any file to open VS Code's native diff editor, showing exactly what changed.
- **Per-round tracking** — Each conversation round shows only its own changes. No accumulation across the entire session.
- **Works everywhere** — Supports both Claude Code CLI and Claude Code VSCode extension.

## Demo

![Demo](https://raw.githubusercontent.com/bbjyzzwwy/Claude_round_files_diff/master/docs/demo.gif)

## Usage

1. Open any project in VS Code
2. Start a Claude Code session and make some edits
3. When each conversation ends, the "Claude Code Changes" panel in the Explorer sidebar updates automatically
4. Click any file to see the diff

---

## TODO

- **Windows support** — The extension currently relies on bash scripts and Python hooks designed for Linux. Windows compatibility is planned.

---

**License:** [MIT](https://github.com/bbjyzzwwy/Claude_round_files_diff/blob/master/LICENSE)
