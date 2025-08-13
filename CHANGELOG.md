# Changelog

## 0.1.0 - 2025-08-13

- Setup Task flow added (`src/commands/setup-task.js`) with:
  - Task metadata prompts (title, description, agent type, model)
  - Editor/inline description with safe fallback
  - Optional codebase indexing
  - Optional autostart of selected agent (Chat started with `--autostart`)
- Single source of truth for tasks:
  - Task Manifest (`.AGENT-X/tasks/<taskId>.json`) with utilities in `src/utils/task-manifest.js`
  - Current task persisted in `.AGENT-X/current-task.json`
  - Index results persisted to `.AGENT-X/index/<taskId>.json` and merged into manifest
  - Task memory cache in `.AGENT-X/cache/<taskId>.json`
- Chat improvements (`src/commands/chat.js`):
  - Reads current task, shows context summary
  - Autostart kickoff using manifest context (`--autostart`)
  - Shortcuts: `/index [taskId]` or natural "scan my codebase"
- Indexer (`src/commands/index-codebase.js`):
  - Writes index, file counts, and updates manifest & memory
  - Sets current taskId for consistent context across tools
- Menu (`src/commands/menu.js`):
  - Replaced Ink menu with Inquirer TTY menu for cross-platform reliability
  - Added Setup Task & Index Codebase options; reduced flicker
- Scripts & imports fixed after modularization:
  - `src/scripts/test-agent-system.js` updated imports and main check (Windows/Unix)
- Version bumped to 0.1.0 in `package.json`

### Notes
- Next releases will add chat tool commands (`/task`, `/grep`, `/open`, `/edit`, `/run-tests`), orchestrator use of manifest/index, autonomous improvement loop, curated knowledge sources, and reporting with human-readable diffs.
