import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SettingsManager {
  constructor() {
    this.settingsPath = path.join(process.cwd(), '.agentx-settings.json');
    this.defaultSettings = {
      api: {
        provider: 'nvidia',
        model: 'openai/gpt-oss-20b',
        baseURL: 'https://integrate.api.nvidia.com/v1',
        maxTokens: 2000,
        temperature: 0.7
      },
      ui: {
        theme: 'dark',
        language: 'en',
        animations: true,
        sound: false
      },
      agents: {
        defaultTimeout: 30000,
        maxRetries: 3,
        parallelProcessing: true
      },
      files: {
        autoBackup: true,
        backupDir: '.agentx-backups',
        maxFileSize: 1024 * 1024 * 10 // 10MB
      },
      logging: {
        level: 'info',
        saveLogs: true,
        logDir: '.agentx-logs'
      }
    };
    this.settings = { ...this.defaultSettings };
    this.load();
  }

  async load() {
    try {
      if (await fs.pathExists(this.settingsPath)) {
        const loaded = await fs.readJson(this.settingsPath);
        this.settings = this.mergeDeep(this.defaultSettings, loaded);
      } else {
        await this.save();
      }
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error.message);
    }
  }

  async save() {
    try {
      await fs.ensureDir(path.dirname(this.settingsPath));
      await fs.writeJson(this.settingsPath, this.settings, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save settings:', error.message);
    }
  }

  get(key) {
    return this.getNestedValue(this.settings, key);
  }

  set(key, value) {
    this.setNestedValue(this.settings, key, value);
    this.save();
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  reset() {
    this.settings = { ...this.defaultSettings };
    this.save();
  }

  getAll() {
    return this.settings;
  }

  validate() {
    const errors = [];
    
    if (!this.settings.api.provider) {
      errors.push('API provider is required');
    }
    
    if (!this.settings.api.model) {
      errors.push('API model is required');
    }
    
    if (!this.settings.api.baseURL) {
      errors.push('API base URL is required');
    }
    
    return errors;
  }

  async exportSettings(filePath) {
    try {
      await fs.writeJson(filePath, this.settings, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Failed to export settings:', error.message);
      return false;
    }
  }

  async importSettings(filePath) {
    try {
      const imported = await fs.readJson(filePath);
      this.settings = this.mergeDeep(this.defaultSettings, imported);
      await this.save();
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error.message);
      return false;
    }
  }

  mergeDeep(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeDeep(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

export default new SettingsManager();