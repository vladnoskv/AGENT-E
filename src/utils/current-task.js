#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const STATE_DIR = join(process.cwd(), '.AGENT-X');
const STATE_FILE = join(STATE_DIR, 'current-task.json');

function ensureDir() {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
}

export function setCurrentTaskId(taskId) {
  ensureDir();
  const data = { taskId, setAt: new Date().toISOString() };
  writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

export function getCurrentTaskId() {
  try {
    if (!existsSync(STATE_FILE)) return null;
    const data = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    return data.taskId || null;
  } catch {
    return null;
  }
}

export default { setCurrentTaskId, getCurrentTaskId };
