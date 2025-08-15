import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const configDir = join(projectRoot, 'config');
const settingsPath = join(configDir, 'settings.json');

const DEFAULTS = {
  continuousChat: true,
};

export function ensureDefaults() {
  if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
  if (!existsSync(settingsPath)) {
    writeFileSync(settingsPath, JSON.stringify(DEFAULTS, null, 2));
  }
}

export function loadSettings() {
  ensureDefaults();
  try {
    const raw = readFileSync(settingsPath, 'utf8');
    const data = JSON.parse(raw);
    return { ...DEFAULTS, ...data };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(next) {
  ensureDefaults();
  writeFileSync(settingsPath, JSON.stringify({ ...DEFAULTS, ...next }, null, 2));
}

export function getSetting(key) {
  const s = loadSettings();
  return s[key];
}

export function setSetting(key, value) {
  const s = loadSettings();
  s[key] = value;
  saveSettings(s);
  return s;
}
