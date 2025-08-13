import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UIManager {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = {};
    this.supportedLanguages = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ru'];
    this.localePath = path.join(__dirname, '..', 'locales');
    this.settingsFile = path.join(process.cwd(), '.agentx-settings.json');
  }

  /**
   * Initialize the UI manager with user's preferred language
   */
  async initialize() {
    try {
      await this.loadSettings();
      await this.loadTranslations(this.currentLanguage);
    } catch (error) {
      console.warn('Failed to initialize UI manager:', error.message);
      this.currentLanguage = 'en';
      await this.loadTranslations('en');
    }
  }

  /**
   * Load user settings from file
   */
  async loadSettings() {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const settings = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
        this.currentLanguage = settings.language || 'en';
      }
    } catch (error) {
      console.warn('Could not load settings, using defaults');
    }
  }

  /**
   * Save user settings to file
   */
  async saveSettings(settings = {}) {
    try {
      const currentSettings = {};
      
      // Load existing settings if file exists
      if (fs.existsSync(this.settingsFile)) {
        Object.assign(currentSettings, JSON.parse(fs.readFileSync(this.settingsFile, 'utf8')));
      }

      // Merge new settings
      Object.assign(currentSettings, settings);
      
      fs.writeFileSync(this.settingsFile, JSON.stringify(currentSettings, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error.message);
      return false;
    }
  }

  /**
   * Load translations for a specific language
   */
  async loadTranslations(language) {
    try {
      const localeFile = path.join(this.localePath, `${language}.json`);
      
      if (!fs.existsSync(localeFile)) {
        console.warn(`Translation file not found for language: ${language}`);
        await this.loadTranslations('en');
        return;
      }

      this.translations = JSON.parse(fs.readFileSync(localeFile, 'utf8'));
      this.currentLanguage = language;
    } catch (error) {
      console.error(`Failed to load translations for ${language}:`, error.message);
      
      // Fallback to English
      if (language !== 'en') {
        await this.loadTranslations('en');
      }
    }
  }

  /**
   * Get translation for a key with optional parameters
   */
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key; // Return key if translation not found
      }
    }

    if (typeof value === 'string') {
      // Replace parameters in the string
      return value.replace(/\{([^}]+)\}/g, (match, param) => {
        return params[param] !== undefined ? params[param] : match;
      });
    }

    return value;
  }

  /**
   * Get available languages with their display names
   */
  getAvailableLanguages() {
    const languageNames = {
      en: 'English',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      ja: '日本語',
      zh: '中文',
      ru: 'Русский'
    };

    return this.supportedLanguages.map(code => ({
      code,
      name: languageNames[code] || code
    }));
  }

  /**
   * Change language and persist setting
   */
  async changeLanguage(language) {
    if (!this.supportedLanguages.includes(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    await this.loadTranslations(language);
    await this.saveSettings({ language });
    return true;
  }

  /**
   * Detect system language preference
   */
  detectSystemLanguage() {
    const envLanguage = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL;
    
    if (envLanguage) {
      const langCode = envLanguage.split('_')[0].toLowerCase();
      if (this.supportedLanguages.includes(langCode)) {
        return langCode;
      }
    }

    return 'en';
  }

  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Check if translation exists for a key
   */
  hasTranslation(key) {
    const keys = key.split('.');
    let value = this.translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all translations for current language
   */
  getAllTranslations() {
    return this.translations;
  }

  /**
   * Create missing translation files based on English template
   */
  async createMissingTranslations() {
    const englishFile = path.join(this.localePath, 'en.json');
    
    if (!fs.existsSync(englishFile)) {
      console.error('English template file not found');
      return false;
    }

    const englishData = JSON.parse(fs.readFileSync(englishFile, 'utf8'));

    for (const language of this.supportedLanguages) {
      if (language === 'en') continue;

      const targetFile = path.join(this.localePath, `${language}.json`);
      
      if (!fs.existsSync(targetFile)) {
        try {
          fs.writeFileSync(targetFile, JSON.stringify(englishData, null, 2));
          console.log(`Created missing translation file: ${language}.json`);
        } catch (error) {
          console.error(`Failed to create ${language}.json:`, error.message);
        }
      }
    }

    return true;
  }
}

// Export singleton instance
const uiManager = new UIManager();
export default uiManager;

// Export class for testing
export { UIManager };