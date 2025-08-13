# Internationalization Guide (i18n)

AGENT-E now supports multiple languages with a comprehensive internationalization system. This guide explains how to use, configure, and contribute translations.

## Supported Languages

Currently supported languages:
- 🇺🇸 English (en) - Default
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)

## Quick Start

### Using Translations

1. **Interactive CLI with i18n:**
   ```bash
   node main/agent-e-i18n.js
   ```

2. **Set language via environment variable:**
   ```bash
   # Use Spanish
   AGENTE_LANG=es node main/agent-e-i18n.js
   
   # Use French
   AGENTE_LANG=fr node main/agent-e-i18n.js
   ```

3. **Change language in settings:**
   - Launch the interactive CLI
   - Select "Settings" from the main menu
   - Choose your preferred language
   - Restart the application

## Translation Files Structure

All translations are stored in the `/locales` directory:

```
locales/
├── en.json          # English (source)
├── es.json          # Spanish
├── fr.json          # French
├── de.json          # German
├── template.json    # Translation template
└── translation-report.json  # Completion report
```

## Translation Keys

The system uses nested JSON structure with dot notation keys:

```json
{
  "app": {
    "title": "Multi-Agent AI CLI Tool",
    "version": "v0.0.1"
  },
  "menu": {
    "title": "Main Menu",
    "options": {
      "chat_with_agent": "Chat with Agent",
      "list_agents": "List Available Agents"
    }
  }
}
```

### Key Categories

- `app.*` - Application-wide strings
- `menu.*` - Menu items and navigation
- `agents.*` - Agent names and descriptions
- `chat.*` - Chat interface strings
- `file.*` - File operation messages
- `settings.*` - Settings and configuration
- `errors.*` - Error messages
- `progress.*` - Progress indicators
- `ui.*` - User interface elements

## Adding New Languages

### 1. Create New Translation File

Create a new JSON file in `/locales` using the language code (e.g., `it.json` for Italian):

```bash
# Copy English template
cp locales/en.json locales/it.json
```

### 2. Translate Strings

Edit the new file and translate all values while keeping keys unchanged:

```json
{
  "app": {
    "title": "Strumento CLI Multi-Agente AI",
    "version": "v0.0.1",
    "welcome": "Benvenuto nel tuo assistente di sviluppo con IA"
  }
}
```

### 3. Update Language Support

Add the new language to the `supportedLanguages` array in:
- `utils/ui-manager.js`
- `scripts/i18n-setup.js`

### 4. Validate Translations

Run the validation script:

```bash
node scripts/i18n-setup.js validate
```

## Translation Management

### Validation

Check all translations for completeness:

```bash
node scripts/i18n-setup.js validate
```

### Sync Translations

Sync missing keys from English to other languages:

```bash
node scripts/i18n-setup.js sync
```

### Generate Report

Create a completion report:

```bash
node scripts/i18n-setup.js report
```

### Export Template

Generate a translation template:

```bash
node scripts/i18n-setup.js template
```

## Contributing Translations

### Guidelines

1. **Keep Context**: Ensure translations maintain the original meaning
2. **Consistency**: Use consistent terminology across the language
3. **Length**: Keep UI strings reasonably short for display constraints
4. **Formatting**: Maintain placeholder variables (e.g., `{agent}`, `{operation}`)

### Placeholder Variables

Preserve all placeholder variables in translations:

```json
{
  "chat": {
    "title": "Chat mit {agent}",
    "thinking": "{agent} denkt nach..."
  }
}
```

### Review Process

1. Create translation file
2. Validate with script
3. Test in application
4. Submit pull request

## UI Manager Configuration

### API Reference

```javascript
import uiManager from './utils/ui-manager.js';

// Initialize
await uiManager.initialize();

// Get translation
uiManager.t('menu.title');
uiManager.t('chat.title', { agent: 'Code Analyzer' });

// Change language
await uiManager.changeLanguage('es');

// Get available languages
const languages = uiManager.getAvailableLanguages();

// Get current language
const current = uiManager.getCurrentLanguage();
```

### Language Detection

The system automatically detects language in this order:
1. Explicit setting (settings file)
2. Environment variable (`AGENTX_LANG`)
3. System locale (`LANG` environment variable)
4. Default to English

## Environment Variables

- `AGENTE_LANG` - Set application language (e.g., `es`, `fr`, `de`)
- `LANG` - System locale fallback (e.g., `en_US`, `es_ES`)

## Testing Translations

### Interactive Testing

```bash
# Test Spanish
AGENTE_LANG=es node main/agent-e-i18n.js

# Test French
AGENTE_LANG=fr node main/agent-e-i18n.js
```

### Automated Testing

Run translation validation:

```bash
npm run test:i18n
```

## File Structure

```
AGENTX/
├── locales/
│   ├── en.json
│   ├── es.json
│   ├── fr.json
│   ├── de.json
│   ├── template.json
│   └── translation-report.json
├── utils/
│   └── ui-manager.js
├── scripts/
│   └── i18n-setup.js
├── main/
│   ├── agentx-i18n.js
│   └── agentx.js
└── I18N_GUIDE.md
```

## Troubleshooting

### Missing Translations

If you see missing translations:
1. Check if the language file exists
2. Run `node scripts/i18n-setup.js sync` to sync missing keys
3. Verify JSON syntax is valid

### Character Encoding

All files should use UTF-8 encoding. If you see character issues:
1. Ensure your editor saves files as UTF-8
2. Check for BOM (Byte Order Mark) issues
3. Validate JSON syntax

### Runtime Issues

If translations don't load:
1. Check file permissions
2. Verify JSON syntax with a validator
3. Ensure locale files exist in `/locales` directory

## Future Enhancements

Planned features:
- Auto-detection of system language
- Dynamic language switching without restart
- Translation contribution portal
- Machine translation integration for new languages
- Translation quality metrics

## Support

For translation issues or questions:
1. Check this guide
2. Run validation scripts
3. Open an issue with language details
4. Join the community for translation discussions