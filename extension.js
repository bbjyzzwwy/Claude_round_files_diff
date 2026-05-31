const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ── 工具函数 ──────────────────────────────────────────────

function getHooksDir() {
  return path.join(os.tmpdir(), 'claude-round-files-diff', 'hooks');
}

function getProjectId(workspaceRoot) {
  return crypto.createHash('md5').update(workspaceRoot).digest('hex').substring(0, 8);
}

function getSnapshotsDir(workspaceRoot) {
  return path.join(os.tmpdir(), 'claude-round-files-diff', getProjectId(workspaceRoot), 'snapshots');
}

/** 检查 Python3 是否可用 */
function checkPython() {
  try {
    execSync('python3 --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ── 国际化 ────────────────────────────────────────────────

const STRINGS = {
  emptyState:     { en: 'No changes — waiting for Claude Code session to end', zh: '暂无改动 — 等待 Claude Code 对话结束' },
  summary:        { en: '$1 files changed',                   zh: '共 $1 个文件改动' },
  added:          { en: 'added',                              zh: '新增' },
  modified:       { en: 'modified',                           zh: '已修改' },
  tooltip:        { en: '$1 — click to view diff',            zh: '$1 — 点击查看 diff' },
  noWorkspace:    { en: 'Please open a workspace first',      zh: '请先打开一个工作区' },
  noPython:       { en: 'Claude Round Files Diff: python3 not found. Please install Python 3 and reload.\nThe Stop hook requires Python 3 to parse Claude Code JSONL files.', zh: 'Claude Round Files Diff: 未找到 python3，请安装 Python 3 后重载窗口\nStop hook 需要 Python 3 来解析 Claude Code 的 JSONL 文件' },
  mkdirFailed:    { en: 'Claude Round Files Diff: failed to create temp directory\n$1\n$2', zh: 'Claude Round Files Diff: 无法创建临时目录\n$1\n$2' },
  writeHookFailed:{ en: 'Claude Round Files Diff: failed to write hook script\n$1\nCheck /tmp permissions', zh: 'Claude Round Files Diff: 无法写入 Hook 脚本\n$1\n请检查 /tmp 目录权限' },
  mkClaudeFailed: { en: 'Claude Round Files Diff: failed to create .claude directory\n$1\n$2', zh: 'Claude Round Files Diff: 无法创建 .claude 目录\n$1\n$2' },
  parseSettingsFailed:{ en: 'Claude Round Files Diff: failed to parse .claude/settings.json — will overwrite\n$1', zh: 'Claude Round Files Diff: .claude/settings.json 解析失败 — 将覆盖\n$1' },
  writeSettingsFailed:{ en: 'Claude Round Files Diff: failed to write .claude/settings.json\n$1', zh: 'Claude Round Files Diff: 无法写入 .claude/settings.json\n$1' },
  hooksRepaired:  { en: '✅ Claude Round Files Diff hooks installed / repaired', zh: '✅ Claude Round Files Diff hooks 已安装/修复' },
  clickFile:      { en: 'Click a file from the list to view diff', zh: '请从文件列表中点击文件查看 diff' },
  fileNotFound:   { en: 'Claude Round Files Diff: file not found\n$1\nThe file may have been deleted or moved', zh: 'Claude Round Files Diff: 文件不存在\n$1\n文件可能已被删除或移动' },
  diffTmpFailed:  { en: 'Claude Round Files Diff: failed to create diff temp directory\n$1', zh: 'Claude Round Files Diff: 无法创建 diff 临时目录\n$1' },
  writeTmpFailed: { en: 'Claude Round Files Diff: failed to write temp file\n$1', zh: 'Claude Round Files Diff: 无法写入临时文件\n$1' },
  reverseFailed:  { en: 'Claude Round Files Diff: failed to reconstruct before-state\n$1\n$2', zh: 'Claude Round Files Diff: 无法还原改动前版本\n$1\n$2' },
  diffOpenFailed: { en: 'Claude Round Files Diff: failed to open diff\n$1', zh: 'Claude Round Files Diff: 打开 diff 失败\n$1' },
  detectChanged:  { en: '🔧 Claude Code changed $1 files this round', zh: '🔧 Claude Code 本轮改动了 $1 个文件' },
  readResultFailed:{ en: 'Claude Round Files Diff: failed to read result file\n$1\n$2', zh: 'Claude Round Files Diff: 读取结果文件失败\n$1\n$2' },
  hooksMissing:   { en: 'Claude Round Files Diff: hook scripts missing in /tmp ($1), auto-repairing...', zh: 'Claude Round Files Diff: /tmp 下的 hook 脚本丢失 ($1)，正在自动修复...' },
  refreshed:      { en: 'Refreshed: $1 files changed', zh: '已刷新：$1 个文件改动' },
  noChanges:      { en: 'No changes recorded for the current round', zh: '暂无本轮对话的改动记录' },
  historyCleared: { en: 'History cleared', zh: '改动历史已清除' },
  clearFailed:    { en: 'Claude Round Files Diff: clear failed\n$1', zh: 'Claude Round Files Diff: 清除失败\n$1' },
  snapMkdirFailed:{ en: 'Claude Round Files Diff: failed to create snapshots directory\n$1\n$2', zh: 'Claude Round Files Diff: 无法创建快照目录\n$1\n$2' },
  viewTitle:      { en: 'Claude Code Changes', zh: 'Claude Code 本轮改动' },
};

function t(key, ...args) {
  const lang = vscode.workspace.getConfiguration('claudeRoundFilesDiff').get('language', 'en');
  const str = (STRINGS[key] && STRINGS[key][lang]) || (STRINGS[key] && STRINGS[key].en) || key;
  let result = str;
  for (let i = 0; i < args.length; i++) {
    result = result.replace('$' + (i + 1), args[i]);
  }
  return result;
}

// ── Hook 脚本 ─────────────────────────────────────────────

const SESSION_START_SCRIPT = `#!/bin/bash
# SessionStart — 清除上一轮结果，标记 JSONL 当前位置作为增量起点
SNAPSHOTS="\${1:-/tmp/claude-round-files-diff/snapshots}"
rm -f "\$SNAPSHOTS/session-result.json"

SESSION_ID="\${CLAUDE_CODE_SESSION_ID:-}"
if [ -n "\$SESSION_ID" ]; then
  PROJECT_DIR=\$(echo "\$PWD" | sed 's/[^a-zA-Z0-9]/-/g')
  JSONL="\$HOME/.claude/projects/\$PROJECT_DIR/\$SESSION_ID.jsonl"
  if [ -f "\$JSONL" ]; then
    BYTES=\$(stat -c%s "\$JSONL" 2>/dev/null || echo 0)
    echo '{"byteOffset":'\$BYTES',"sessionId":"'\$SESSION_ID'"}' > "\$SNAPSHOTS/cursor.json"
  fi
fi
`;

const STOP_REPORT_SCRIPT = `#!/usr/bin/env python3
"""Stop hook — 增量解析 Claude Code JSONL，只提取上次 Stop 之后的新改动"""
import json, os, sys, time, re

session_id = os.environ.get('CLAUDE_CODE_SESSION_ID', '')
if not session_id:
    sys.exit(0)

pwd = os.environ.get('PWD', '')
project_dir = re.sub(r'[^a-zA-Z0-9]', '-', pwd)
jsonl_path = os.path.expanduser(f'~/.claude/projects/{project_dir}/{session_id}.jsonl')

if not os.path.exists(jsonl_path):
    sys.exit(0)

snapshots_dir = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-round-files-diff/snapshots'
os.makedirs(snapshots_dir, exist_ok=True)

cursor_file = os.path.join(snapshots_dir, 'cursor.json')
start_offset = 0
try:
    if os.path.exists(cursor_file):
        with open(cursor_file) as cf:
            cursor = json.load(cf)
        if cursor.get('sessionId') == session_id:
            start_offset = cursor.get('byteOffset', 0)
except (json.JSONDecodeError, KeyError, ValueError):
    pass

file_size = os.path.getsize(jsonl_path)
if start_offset >= file_size:
    sys.exit(0)

files = {}

with open(jsonl_path, 'r', errors='replace') as f:
    f.seek(start_offset)
    if start_offset > 0:
        f.readline()
    for line in f:
        try:
            obj = json.loads(line)
        except (json.JSONDecodeError, ValueError):
            continue
        msg = obj.get('message', {})
        if not isinstance(msg, dict):
            continue
        for part in msg.get('content', []):
            if not isinstance(part, dict) or part.get('type') != 'tool_use':
                continue
            name = part.get('name', '')
            inp = part.get('input', {})
            fp = inp.get('file_path', '')
            if not fp:
                continue
            abs_fp = fp if os.path.isabs(fp) else os.path.join(pwd, fp)
            if not abs_fp.startswith(pwd + os.sep) and abs_fp != pwd:
                continue
            rel_path = os.path.relpath(abs_fp, pwd)
            if rel_path not in files:
                files[rel_path] = {'edits': [], 'writes': 0}
            if name == 'Edit':
                files[rel_path]['edits'].append({
                    'old': inp.get('old_string', ''),
                    'new': inp.get('new_string', ''),
                    'replaceAll': inp.get('replace_all', False)
                })
            elif name == 'Write':
                files[rel_path]['writes'] += 1

with open(cursor_file, 'w') as cf:
    json.dump({'byteOffset': file_size, 'sessionId': session_id}, cf)

if not files:
    sys.exit(0)

changed_files = []
for fp, data in files.items():
    has_edits = len(data['edits']) > 0
    status = 'modified' if has_edits else 'added'
    entry = {'path': fp, 'status': status}
    if has_edits:
        entry['edits'] = data['edits']
    changed_files.append(entry)

result = {
    'changedFiles': changed_files,
    'timestamp': int(time.time())
}

result_file = os.path.join(snapshots_dir, 'session-result.json')
with open(result_file, 'w') as f:
    json.dump(result, f, ensure_ascii=False)
`;

// ── 全局状态 ──────────────────────────────────────────────
let treeDataProvider;
let currentData = null;
let currentWorkspaceRoot = null;
let watchFileStop = null;

// ── TreeItem ───────────────────────────────────────────────

class ChangedFileItem extends vscode.TreeItem {
  constructor(filePath, label, edits, isAdded) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.filePath = filePath;
    this.edits = edits;
    this.isAdded = isAdded;

    this.command = {
      command: 'claude-round-files-diff.showDiff',
      title: 'Show Diff',
      arguments: [this]
    };

    this.contextValue = 'changedFile';
    if (isAdded) {
      this.iconPath = new vscode.ThemeIcon('diff-added', new vscode.ThemeColor('charts.green'));
      this.description = t('added');
    } else {
      this.iconPath = new vscode.ThemeIcon('diff-modified', new vscode.ThemeColor('charts.blue'));
      this.description = t('modified');
    }
    this.tooltip = t('tooltip', filePath);
  }
}

// ── TreeDataProvider ───────────────────────────────────────

class SessionChangesProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh(data) {
    currentData = data;
    this._onDidChangeTreeData.fire();
  }

  clear() {
    currentData = null;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    if (element) return [];

    if (!currentData || !currentData.changedFiles || currentData.changedFiles.length === 0) {
      const empty = new vscode.TreeItem(
        t('emptyState'),
        vscode.TreeItemCollapsibleState.None
      );
      empty.iconPath = new vscode.ThemeIcon('info');
      return [empty];
    }

    const items = currentData.changedFiles.map(file => {
      const fileName = path.basename(file.path);
      const dirName = path.dirname(file.path);
      const label = dirName === '.' ? fileName : `${fileName}  (${dirName}/)`;
      return new ChangedFileItem(file.path, label, file.edits || null, file.status === 'added');
    });

    const summary = new vscode.TreeItem(
      t('summary', String(items.length)),
      vscode.TreeItemCollapsibleState.None
    );
    summary.iconPath = new vscode.ThemeIcon('list-tree');
    summary.description = new Date(currentData.timestamp * 1000).toLocaleTimeString();

    return [summary, ...items];
  }
}

// ── Hook 安装 ─────────────────────────────────────────────

async function ensureHooksInstalled(workspaceRoot) {
  const hooksDir = getHooksDir();
  const snapshotsDir = getSnapshotsDir(workspaceRoot);
  const settingsFile = path.join(workspaceRoot, '.claude', 'settings.json');

  try {
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.mkdirSync(snapshotsDir, { recursive: true });
  } catch (e) {
    vscode.window.showErrorMessage(
      t('mkdirFailed', hooksDir, e.message)
    );
    return;
  }

  const startScript = path.join(hooksDir, 'session-start.sh');
  const stopScript = path.join(hooksDir, 'stop-report.py');

  try {
    fs.writeFileSync(startScript, SESSION_START_SCRIPT, { mode: 0o755 });
    fs.writeFileSync(stopScript, STOP_REPORT_SCRIPT, { mode: 0o755 });
  } catch (e) {
    vscode.window.showErrorMessage(
      t('writeHookFailed', e.message)
    );
    return;
  }

  const hooksConfig = {
    SessionStart: [{
      hooks: [{ type: 'command', command: `bash ${startScript} ${snapshotsDir}` }]
    }],
    Stop: [{
      hooks: [{ type: 'command', command: `python3 ${stopScript} ${snapshotsDir}` }]
    }]
  };

  const claudeDir = path.join(workspaceRoot, '.claude');
  try {
    fs.mkdirSync(claudeDir, { recursive: true });
  } catch (e) {
    vscode.window.showErrorMessage(
      t('mkClaudeFailed', claudeDir, e.message)
    );
    return;
  }

  let settings = {};
  if (fs.existsSync(settingsFile)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
    } catch (e) {
      vscode.window.showWarningMessage(
        t('parseSettingsFailed', e.message)
      );
    }
  }
  if (!settings.hooks) settings.hooks = {};

  let changed = false;
  for (const [hookName, hookConfig] of Object.entries(hooksConfig)) {
    if (JSON.stringify(settings.hooks[hookName]) !== JSON.stringify(hookConfig)) {
      settings.hooks[hookName] = hookConfig;
      changed = true;
    }
  }

  if (changed) {
    try {
      fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2) + '\n');
    } catch (e) {
      vscode.window.showErrorMessage(
        t('writeSettingsFailed', e.message)
      );
    }
  }
}

// ── Diff 视图 ─────────────────────────────────────────────

function reverseEdits(absPath, edits) {
  let content = fs.readFileSync(absPath, 'utf-8');
  for (let i = edits.length - 1; i >= 0; i--) {
    const e = edits[i];
    if (e.replaceAll) {
      content = content.replaceAll(e.new, e.old);
    } else {
      const idx = content.indexOf(e.new);
      if (idx !== -1) {
        content = content.slice(0, idx) + e.old + content.slice(idx + e.new.length);
      }
    }
  }
  return content;
}

async function showDiff(item) {
  if (!item || !item.filePath) {
    vscode.window.showWarningMessage(t('clickFile'));
    return;
  }
  if (!currentWorkspaceRoot) return;

  const absPath = path.join(currentWorkspaceRoot, item.filePath);

  if (!fs.existsSync(absPath)) {
    vscode.window.showErrorMessage(
      t('fileNotFound', item.filePath)
    );
    return;
  }

  const afterUri = vscode.Uri.file(absPath);
  const diffTmp = path.join(os.tmpdir(), 'claude-round-files-diff', 'diff');

  try {
    fs.mkdirSync(diffTmp, { recursive: true });
  } catch (e) {
    vscode.window.showErrorMessage(t('diffTmpFailed', e.message));
    return;
  }

  const ext = path.extname(item.filePath);
  const base = path.basename(item.filePath, ext);
  let beforeUri;

  if (item.isAdded || !item.edits || item.edits.length === 0) {
    const emptyFile = path.join(diffTmp, `${base}.empty${ext}`);
    try {
      fs.writeFileSync(emptyFile, '');
    } catch (e) {
      vscode.window.showErrorMessage(t('writeTmpFailed', e.message));
      return;
    }
    beforeUri = vscode.Uri.file(emptyFile);
  } else {
    try {
      const beforeContent = reverseEdits(absPath, item.edits);
      const beforeFile = path.join(diffTmp, `${base}.before${ext}`);
      fs.writeFileSync(beforeFile, beforeContent);
      beforeUri = vscode.Uri.file(beforeFile);
    } catch (e) {
      vscode.window.showErrorMessage(
        t('reverseFailed', item.filePath, e.message)
      );
      return;
    }
  }

  const title = `${path.basename(item.filePath)} (改动前 → 改动后)`;
  try {
    await vscode.commands.executeCommand('vscode.diff', beforeUri, afterUri, title);
  } catch (e) {
    vscode.window.showErrorMessage(t('diffOpenFailed', e.message));
  }
}

// ── 文件监听 / 数据加载 ────────────────────────────────────

function loadResult(snapshotsDir) {
  const resultFile = path.join(snapshotsDir, 'session-result.json');
  if (!fs.existsSync(resultFile)) {
    treeDataProvider.clear();
    return;
  }
  try {
    const raw = fs.readFileSync(resultFile, 'utf-8');
    const data = JSON.parse(raw);
    if (data.changedFiles?.length > 0) {
      treeDataProvider.refresh(data);
      vscode.window.showInformationMessage(
        t('detectChanged', String(data.changedFiles.length))
      );
    }
  } catch (e) {
    vscode.window.showErrorMessage(t('readResultFailed', resultFile, e.message));
  }
}

/** 检测并修复 temp 目录下的文件丢失问题 */
function verifyTempFiles() {
  if (!currentWorkspaceRoot) return;

  const hooksDir = getHooksDir();
  const startScript = path.join(hooksDir, 'session-start.sh');
  const stopScript = path.join(hooksDir, 'stop-report.py');

  const missing = [];
  if (!fs.existsSync(startScript)) missing.push('session-start.sh');
  if (!fs.existsSync(stopScript)) missing.push('stop-report.py');

  if (missing.length > 0) {
    vscode.window.showWarningMessage(
      t('hooksMissing', missing.join(', '))
    );
    ensureHooksInstalled(currentWorkspaceRoot);
  }
}

// ── 命令 ──────────────────────────────────────────────────

async function refreshView() {
  if (!currentWorkspaceRoot) return;

  verifyTempFiles();

  const snapshotsDir = getSnapshotsDir(currentWorkspaceRoot);
  const resultFile = path.join(snapshotsDir, 'session-result.json');
  if (fs.existsSync(resultFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(resultFile, 'utf-8'));
      treeDataProvider.refresh(data);
      vscode.window.showInformationMessage(t('refreshed', String(data.changedFiles?.length || 0)));
    } catch (e) {
      vscode.window.showErrorMessage(t('readResultFailed', resultFile, e.message));
    }
  } else {
    treeDataProvider.clear();
    vscode.window.showInformationMessage(t('noChanges'));
  }
}

async function clearHistory() {
  if (!currentWorkspaceRoot) return;
  treeDataProvider.clear();

  const snapshotDir = getSnapshotsDir(currentWorkspaceRoot);
  if (fs.existsSync(snapshotDir)) {
    try {
      fs.readdirSync(snapshotDir).forEach(f => {
        if (f.startsWith('session-') || f.startsWith('cursor.')) {
          fs.unlinkSync(path.join(snapshotDir, f));
        }
      });
    } catch (e) {
      vscode.window.showErrorMessage(t('clearFailed', e.message));
    }
  }
  vscode.window.showInformationMessage(t('historyCleared'));
}

async function setupHooks() {
  if (!currentWorkspaceRoot) {
    vscode.window.showErrorMessage(t('noWorkspace'));
    return;
  }
  await ensureHooksInstalled(currentWorkspaceRoot);
  vscode.window.showInformationMessage(t('hooksRepaired'));
}

// ── 激活 ──────────────────────────────────────────────────

async function activate(context) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  if (!workspaceRoot) {
    return;
  }

  // 检查 Python3
  if (!checkPython()) {
    vscode.window.showErrorMessage(t('noPython'));
    return;
  }

  currentWorkspaceRoot = workspaceRoot;
  await ensureHooksInstalled(workspaceRoot);

  const snapshotsDir = getSnapshotsDir(workspaceRoot);

  // TreeView（Explorer 面板底部）
  treeDataProvider = new SessionChangesProvider();
  const treeView = vscode.window.createTreeView('claudeRoundFilesDiff', {
    treeDataProvider,
    showCollapseAll: false
  });
  context.subscriptions.push(treeView);

  // 注册命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claude-round-files-diff.showDiff', showDiff)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('claude-round-files-diff.refresh', refreshView)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('claude-round-files-diff.clearHistory', clearHistory)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('claude-round-files-diff.setupHooks', setupHooks)
  );

  // 文件监听
  try {
    fs.mkdirSync(snapshotsDir, { recursive: true });
  } catch (e) {
    vscode.window.showErrorMessage(
      t('snapMkdirFailed', snapshotsDir, e.message)
    );
    return;
  }

  const resultFile = path.join(snapshotsDir, 'session-result.json');
  fs.watchFile(resultFile, { interval: 1000 }, (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs) {
      verifyTempFiles();
      if (!fs.existsSync(resultFile)) {
        treeDataProvider.clear();
      } else {
        loadResult(snapshotsDir);
      }
    }
  });
  watchFileStop = () => fs.unwatchFile(resultFile);

  // 启动时检查 temp 文件完整性 + 加载遗留结果
  verifyTempFiles();
  loadResult(snapshotsDir);

}

function deactivate() {
  if (watchFileStop) {
    watchFileStop();
    watchFileStop = null;
  }
}

module.exports = { activate, deactivate };
