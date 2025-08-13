import { 
  initRuntime as _initRuntime,
  t as _t,
  translate as _translate,
  setLanguage as _setLanguage,
  getAvailableLanguages as _getAvailableLanguages,
  getCurrentLanguage as _getCurrentLanguage,
  onLanguageChange as _onLanguageChange
} from 'i18ntk/runtime';
import path from 'path';

// Initialize i18n with default configuration
let isInitialized = false;
const languageChangeListeners = new Set();

// Default configuration
const defaultConfig = {
  // Directory containing locale files (default: './locales')
  baseDir: path.join(process.cwd(), 'translations'),
  
  // Default language (default: 'en')
  language: 'en',
  
  // Fallback language if translation is missing (default: 'en')
  fallbackLanguage: 'en',
  
  // Key separator for nested translations (default: '.')
  keySeparator: '.',
  
  // Whether to preload all languages (default: false)
  preload: true,
  
  // Custom logger
  logger: {
    warn: (message) => console.warn(`[i18n] ${message}`),
    error: (message) => console.error(`[i18n] ${message}`)
  }
};

/**
 * Initialize the i18n system
 * @param {Object} [config] - Configuration options
 * @returns {Promise<void>}
 */
export async function initI18n(config = {}) {
  if (isInitialized) {
    console.warn('[i18n] i18n is already initialized');
    return;
  }

  try {
    const finalConfig = { ...defaultConfig, ...config };
    
    // Initialize the runtime with the merged config
    await _initRuntime(finalConfig);
    
    // Set up language change listener
    _onLanguageChange((newLang) => {
      console.log(`[i18n] Language changed to: ${newLang}`);
      languageChangeListeners.forEach(callback => callback(newLang));
    });
    
    isInitialized = true;
    console.log(`[i18n] Initialized with language: ${finalConfig.language}`);
  } catch (error) {
    console.error('[i18n] Failed to initialize i18n:', error);
    throw error;
  }
}

/**
 * Change the current language
 * @param {string} language - The language code to switch to (e.g., 'en', 'ru')
 * @returns {Promise<boolean>} - True if language was changed successfully
 */
export async function changeLanguage(language) {
  if (!isInitialized) {
    console.warn('[i18n] i18n is not initialized. Call initI18n() first.');
    return false;
  }
  
  try {
    await _setLanguage(language);
    return true;
  } catch (error) {
    console.error(`[i18n] Failed to change language to ${language}:`, error);
    return false;
  }
}

/**
 * Get translation for a key
 * @param {string} key - Translation key (e.g., 'common.greeting')
 * @param {Object} [params] - Parameters to interpolate into the translation
 * @returns {string} - The translated string
 */
export function t(key, params = {}) {
  if (!isInitialized) {
    console.warn('[i18n] i18n is not initialized. Call initI18n() first.');
    return key;
  }
  
  try {
    return _t(key, params);
  } catch (error) {
    console.error(`[i18n] Failed to translate key '${key}':`, error);
    return key;
  }
}

/**
 * Get translation for a key with pluralization
 * @param {string} key - Translation key
 * @param {number} count - The count for pluralization
 * @param {Object} [params] - Additional parameters to interpolate
 * @returns {string} - The translated string with proper pluralization
 */
export function tPlural(key, count, params = {}) {
  return t(key, { ...params, count });
}

/**
 * Add a language change listener
 * @param {Function} callback - Function to call when language changes
 * @returns {Function} - Unsubscribe function
 */
export function onLanguageChange(callback) {
  if (typeof callback !== 'function') {
    throw new Error('Language change listener must be a function');
  }
  
  languageChangeListeners.add(callback);
  return () => languageChangeListeners.delete(callback);
}

/**
 * Get the current language
 * @returns {string} - The current language code
 */
export function getCurrentLanguage() {
  return _getCurrentLanguage();
}

/**
 * Get available languages
 * @returns {string[]} - Array of available language codes
 */
export function getAvailableLanguages() {
  try {
    return _getAvailableLanguages() || ['en'];
  } catch (error) {
    console.error('[i18n] Failed to get available languages:', error);
    return ['en'];
  }
}

// Alias for t()
export const translate = _translate || t;

// Export all functions as default object
export default {
  init: initI18n,
  t,
  translate,
  tPlural,
  changeLanguage,
  getCurrentLanguage,
  getAvailableLanguages,
  onLanguageChange
};
