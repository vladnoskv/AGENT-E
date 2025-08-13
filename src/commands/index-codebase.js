#!/usr/bin/env node

import { readdirSync, statSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import chalk from 'chalk';
import { writeTaskMemory } from '../utils/task-memory.js';
import { writeTaskManifest } from '../utils/task-manifest.js';
import { setCurrentTaskId } from '../utils/current-task.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = __filename.substring(0, __filename.lastIndexOf('/'));

const PROJECT_ROOT = process.cwd();
const OUT_DIR = join(PROJECT_ROOT, '.AGENT-X', 'index');

const EXCLUDES = new Set(['node_modules', '.git', '.AGENT-X']);
const MAX_BYTES_TO_SAMPLE = 2048; // small snippet sample per file

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function hashContent(buf) {
  const h = crypto.createHash('sha256');
  h.update(buf);
  return h.digest('hex');
}

function shouldSkip(path, name) {
  if (EXCLUDES.has(name)) return true;
  // skip big binary-like files by extension
  const lower = name.toLowerCase();
  const skipExt = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.zip', '.gz', '.tar', '.rar', '.7z', '.pdf', '.dll', '.exe'];
  return skipExt.some(ext => lower.endsWith(ext));
}

function walk(dir, base) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    if (shouldSkip(dir, name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      entries.push(...walk(full, base));
    } else if (st.isFile()) {
      const rel = relative(base, full);
      let sample = '';
      try {
        const buf = readFileSync(full);
        sample = buf.slice(0, MAX_BYTES_TO_SAMPLE).toString('utf-8');
        entries.push({
          path: rel,
          size: st.size,
          mtimeMs: st.mtimeMs,
          hash: hashContent(buf),
          sample
        });
      } catch {
        entries.push({ path: rel, size: st.size, mtimeMs: st.mtimeMs, hash: null, sample: '' });
      }
    }
  }
  return entries;
}

function parseArgs(argv) {
  const out = { task: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--task' && argv[i + 1]) {
      out.task = argv[i + 1];
      i++;
    }
  }
  return out;
}

async function main() {
  console.log(chalk.cyan('\nIndexing codebase...'));
  const { task } = parseArgs(process.argv.slice(2));
  const taskId = task || new Date().toISOString().replace(/[:.]/g, '-');

  ensureDir(OUT_DIR);
  const files = walk(PROJECT_ROOT, PROJECT_ROOT);
  const summary = {
    projectRoot: PROJECT_ROOT,
    indexedAt: new Date().toISOString(),
    fileCount: files.length,
    totalBytes: files.reduce((a, f) => a + (f.size || 0), 0),
  };
  const data = { summary, files };

  const outPath = join(OUT_DIR, `${taskId}.json`);
  writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
  writeTaskMemory(taskId, { ...summary, indexPath: outPath });
  writeTaskManifest(taskId, { ...summary, indexPath: outPath });
  setCurrentTaskId(taskId);

  console.log(chalk.green(`\n✅ Indexed ${files.length} files. Index: ${outPath}`));
  console.log(chalk.cyan(`\nTask ID: ${taskId}`));
  console.log(chalk.yellow('Use this taskId when running tools that need context.'));
}

main().catch((err) => {
  console.error(chalk.red('Indexing failed:'), err);
  process.exit(1);
});
