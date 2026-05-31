# Changelog

All notable changes to the "Claude Round Files Diff" extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-05-31

### Added

- **JSONL-based file detection**: Parses Claude Code's own conversation logs to identify changed files. No git dependency — works in any directory.
- **Incremental cursor**: Each conversation round tracks only its own changes via byte-offset cursor in the JSONL. No cross-round accumulation.
- **One-click diff**: Click any file in the tree view to open VS Code's native diff editor. Before-state is reconstructed by reverse-applying Edit operations from the JSONL.
- **Explorer panel integration**: Changed file list appears in the Explorer sidebar, below the file tree and outline.
- **Zero-config hook installation**: Extension automatically writes the Python Stop hook and bash SessionStart hook to system temp on activation, and registers them in `.claude/settings.json`.
- **Per-project isolation**: Snapshots stored in `/tmp/claude-round-files-diff/<project-md5>/snapshots/` to avoid conflicts between multiple open projects.
- **Error resilience**: Detects and auto-repairs missing hook scripts. Reports Python 3 unavailability, directory permission errors, parse failures, and file-not-found conditions.
- Commands: `refresh`, `clearHistory`, `setupHooks`, `showDiff`.
- Toolbar buttons for refresh and clear history on the tree view title bar.
- Bilingual README (English / 中文).
