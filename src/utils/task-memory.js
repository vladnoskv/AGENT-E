#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CACHE_ROOT = join(process.cwd(), '.AGENT-X', 'cache');

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function getTaskCachePath(taskId) {
  ensureDir(CACHE_ROOT);
  return join(CACHE_ROOT, `${taskId}.json`);
}

export function readTaskMemory(taskId, defaultValue = {}) {
  const p = getTaskCachePath(taskId);
  if (!existsSync(p)) return defaultValue;
  try {
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    return defaultValue;
  }
}

export function writeTaskMemory(taskId, data) {
  const p = getTaskCachePath(taskId);
  ensureDir(dirname(p));
  writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  return p;
}

export default { getTaskCachePath, readTaskMemory, writeTaskMemory };
