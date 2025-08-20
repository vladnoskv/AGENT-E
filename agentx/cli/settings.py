"""
AGENT-X Settings Management

This module handles the loading and saving of application settings.
"""
from pathlib import Path
import json
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

DEFAULT_SETTINGS = {
    "ui": {
        "auto_clear_console": False,
        "show_banner": True,
        "theme": "dark",
        "web_ui": {
            "auto_launch_browser": True,
            "host": "localhost",
            "port": 3000,
            "api_port": 8000
        }
    },
    "models": {
        "default_model": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 2000
    }
}

class SettingsManager:
    _instance = None
    _settings_file = Path.home() / ".agentx" / "settings.json"
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SettingsManager, cls).__new__(cls)
            cls._instance._settings = {}
            cls._instance.load_settings()
        return cls._instance
    
    def __init__(self):
        self._settings = {}
        self.load_settings()
    
    @property
    def settings(self) -> Dict[str, Any]:
        """Get the current settings."""
        return self._settings
    
    def load_settings(self) -> None:
        """Load settings from file or create default settings if not exists."""
        try:
            if self._settings_file.exists():
                with open(self._settings_file, 'r', encoding='utf-8') as f:
                    self._settings = json.load(f)
                # Ensure all default settings exist
                self._migrate_settings()
            else:
                self._settings = DEFAULT_SETTINGS.copy()
                self.save_settings()
        except Exception as e:
            logger.error(f"Error loading settings: {e}")
            self._settings = DEFAULT_SETTINGS.copy()
    
    def save_settings(self) -> None:
        """Save current settings to file."""
        try:
            self._settings_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self._settings_file, 'w', encoding='utf-8') as f:
                json.dump(self._settings, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving settings: {e}")
    
    def _migrate_settings(self) -> None:
        """Ensure all default settings exist in the current settings."""
        def _merge_dict(default: Dict, current: Dict, path: str = '') -> None:
            for key, value in default.items():
                current_path = f"{path}.{key}" if path else key
                if key not in current:
                    current[key] = value
                elif isinstance(value, dict) and isinstance(current[key], dict):
                    _merge_dict(value, current[key], current_path)
        
        _merge_dict(DEFAULT_SETTINGS, self._settings)
        self.save_settings()
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a setting value by dot notation key."""
        keys = key.split('.')
        value = self._settings
        try:
            for k in keys:
                value = value[k]
            return value
        except (KeyError, TypeError):
            return default
    
    def set(self, key: str, value: Any) -> None:
        """Set a setting value by dot notation key."""
        keys = key.split('.')
        current = self._settings
        for k in keys[:-1]:
            if k not in current or not isinstance(current[k], dict):
                current[k] = {}
            current = current[k]
        current[keys[-1]] = value
        self.save_settings()

# Global settings instance
settings = SettingsManager()

def get_setting(key: str, default: Any = None) -> Any:
    """Helper function to get a setting value."""
    return settings.get(key, default)

def set_setting(key: str, value: Any) -> None:
    """Helper function to set a setting value."""
    settings.set(key, value)
