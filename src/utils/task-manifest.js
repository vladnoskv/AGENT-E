import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const TASKS_DIR = join(process.cwd(), '.agent-e', 'tasks');

function ensureDir() {
  if (!existsSync(TASKS_DIR)) mkdirSync(TASKS_DIR, { recursive: true });
}

export function manifestPath(taskId) {
  ensureDir();
  return join(TASKS_DIR, `${taskId}.json`);
}

export function readTaskManifest(taskId) {
  try {
    const p = manifestPath(taskId);
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

export function writeTaskManifest(taskId, data) {
  const p = manifestPath(taskId);
  const current = readTaskManifest(taskId) || {};
  const merged = { ...current, ...data, taskId };
  writeFileSync(p, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

export default { readTaskManifest, writeTaskManifest, manifestPath };
