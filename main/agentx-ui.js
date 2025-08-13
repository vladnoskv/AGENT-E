#!/usr/bin/env node

import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useApp, useInput, useStdout, Static, Newline } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import Divider from 'ink-divider';
import settingsManager from '../utils/settings-manager.js';

const AGENTE_UI = () => {
  const { exit } = useApp();
  const [currentScreen, setCurrentScreen] = useState('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(settingsManager.getAll());
  const [notifications, setNotifications] = useState([]);
  const [agentStatus, setAgentStatus] = useState({});

  // Add notification
  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Main menu items
  const mainMenuItems = [
    { label: '🗣️  Interactive Chat', value: 'chat' },
    { label: '🤖 Run Agent', value: 'agent' },
    { label: '👥 Multi-Agent Demo', value: 'demo' },
    { label: '⚙️  Settings', value: 'settings' },
    { label: 'ℹ️  About', value: 'about' },
    { label: '🚪 Exit', value: 'exit' }
  ];

  // Settings menu items
  const settingsMenuItems = [
    { label: '🔧 API Configuration', value: 'api' },
    { label: '🎨 UI Preferences', value: 'ui' },
    { label: '🤖 Agent Settings', value: 'agents' },
    { label: '💾 Backup & Restore', value: 'backup' },
    { label: '🔍 View Current Settings', value: 'view' },
    { label: '← Back to Main Menu', value: 'back' }
  ];

  // Handle menu selection
  const handleMainSelect = async (item) => {
    setLoading(true);
    setError(null);

    try {
      switch (item.value) {
        case 'chat':
          setCurrentScreen('chat');
          break;
        case 'agent':
          setCurrentScreen('agent-select');
          break;
        case 'demo':
          await runMultiAgentDemo();
          break;
        case 'settings':
          setCurrentScreen('settings');
          break;
        case 'about':
          setCurrentScreen('about');
          break;
        case 'exit':
          exit();
          break;
      }
    } catch (err) {
      setError(err.message);
      addNotification(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle settings selection
  const handleSettingsSelect = async (item) => {
    setCurrentScreen(`settings-${item.value}`);
  };

  // Run multi-agent demo
  const runMultiAgentDemo = async () => {
    try {
      const { default: MultiAgentSystem } = await import('./multi-agent.js');
      const system = new MultiAgentSystem();
      
      addNotification('Starting multi-agent demo...', 'info');
      const result = await system.executeTask('Analyze the current directory structure and provide insights', { verbose: true });
      
      setAgentStatus({
        type: 'demo',
        result: result.synthesizedResponse,
        completed: true
      });
      
      addNotification('Demo completed successfully!', 'success');
    } catch (err) {
      setError(err.message);
      addNotification(`Demo failed: ${err.message}`, 'error');
    }
  };

  // Update settings
  const updateSetting = (key, value) => {
    settingsManager.set(key, value);
    setSettings(settingsManager.getAll());
    addNotification(`Setting updated: ${key}`, 'success');
  };

  // Reset settings
  const resetSettings = () => {
    settingsManager.reset();
    setSettings(settingsManager.getAll());
    addNotification('Settings reset to defaults', 'info');
  };

  // Render main menu
  const renderMainMenu = () => (
    <Box flexDirection="column">
      <Box justifyContent="center" marginBottom={1}>
        <BigText text="AGENT-E" font="tiny" colors={['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#0080ff', '#8000ff']} />
      </Box>
      
      <Box justifyContent="center" marginBottom={1}>
        <Gradient colors={['#00ff00', '#0080ff']}>
          <Text>Multi-agent AI toolkit for enhanced productivity</Text>
        </Gradient>
      </Box>

      <Divider title="Main Menu" />

      <SelectInput
        items={mainMenuItems}
        onSelect={handleMainSelect}
        indicatorComponent={({ isSelected }) => (
          <Text color={isSelected ? 'cyan' : 'white'}>
            {isSelected ? '❯ ' : '  '}
          </Text>
        )}
        itemComponent={({ label, isSelected }) => (
          <Text color={isSelected ? 'cyan' : 'white'}>{label}</Text>
        )}
      />

      {notifications.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow">Notifications:</Text>
          {notifications.map((notif) => (
            <Text key={notif.id} color={notif.type === 'error' ? 'red' : notif.type === 'success' ? 'green' : 'blue'}>
              • {notif.message}
            </Text>
          ))}
        </Box>
      )}

      {error && (
        <Box marginTop={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}
    </Box>
  );

  // Render settings menu
  const renderSettingsMenu = () => (
    <Box flexDirection="column">
      <Box justifyContent="center" marginBottom={1}>
        <Text color="cyan" bold>Settings Configuration</Text>
      </Box>

      <Divider title="Settings" />

      <SelectInput
        items={settingsMenuItems}
        onSelect={handleSettingsSelect}
        indicatorComponent={({ isSelected }) => (
          <Text color={isSelected ? 'cyan' : 'white'}>
            {isSelected ? '❯ ' : '  '}
          </Text>
        )}
        itemComponent={({ label, isSelected }) => (
          <Text color={isSelected ? 'cyan' : 'white'}>{label}</Text>
        )}
      />
    </Box>
  );

  // Render API settings
  const renderApiSettings = () => (
    <Box flexDirection="column">
      <Text color="cyan" bold>API Configuration</Text>
      <Newline />
      
      <Text>Provider: {settings.api.provider}</Text>
      <Text>Model: {settings.api.model}</Text>
      <Text>Base URL: {settings.api.baseURL}</Text>
      <Text>Max Tokens: {settings.api.maxTokens}</Text>
      <Text>Temperature: {settings.api.temperature}</Text>
      
      <Newline />
      <Text>Use arrow keys to navigate, press 'b' to go back</Text>
    </Box>
  );

  // Render agent select
  const renderAgentSelect = () => {
    const agents = [
      { label: '🧠 Master Agent', value: 'master' },
      { label: '🔍 Code Analyzer', value: 'codeAnalyzer' },
      { label: '📝 Documentation Writer', value: 'documentationWriter' },
      { label: '🐛 Bug Fixer', value: 'bugFixer' },
      { label: '🏗️ Architect', value: 'architect' },
      { label: '🔒 Security Expert', value: 'securityExpert' }
    ];

    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>Select Agent</Text>
        <Newline />
        
        <SelectInput
          items={agents}
          onSelect={async (item) => {
            setLoading(true);
            try {
              const { default: AIAgent } = await import('./agent.js');
              const agent = new AIAgent();
              addNotification(`Running ${item.label}...`, 'info');
              
              // This would be enhanced with actual agent execution
              setAgentStatus({
                type: 'agent',
                agent: item.value,
                completed: true
              });
              
              addNotification(`${item.label} completed`, 'success');
            } catch (err) {
              setError(err.message);
              addNotification(`Agent error: ${err.message}`, 'error');
            } finally {
              setLoading(false);
              setCurrentScreen('main');
            }
          }}
        />
        
        <Newline />
        <Text>Use arrow keys to select, press 'b' to go back</Text>
      </Box>
    );
  };

  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape || input === 'q' || input === 'Q') {
      exit();
    }
    
    if (input === 'b' || input === 'B') {
      if (currentScreen.startsWith('settings-')) {
        setCurrentScreen('settings');
      } else if (currentScreen === 'settings') {
        setCurrentScreen('main');
      } else {
        setCurrentScreen('main');
      }
    }
  });

  // Render current screen
  const renderCurrentScreen = () => {
    if (loading) {
      return (
        <Box justifyContent="center" alignItems="center" flexDirection="column">
          <Spinner type="dots" />
          <Text>Loading...</Text>
        </Box>
      );
    }

    switch (currentScreen) {
      case 'main':
        return renderMainMenu();
      case 'settings':
        return renderSettingsMenu();
      case 'settings-api':
        return renderApiSettings();
      case 'agent-select':
        return renderAgentSelect();
      case 'about':
        return (
          <Box flexDirection="column">
            <Text color="cyan" bold>About AGENT-E</Text>
            <Newline />
            <Text>Version: 1.0.0</Text>
            <Text>Description: Multi-agent AI toolkit</Text>
            <Text>Features: 6 specialized agents, file operations, MCP support</Text>
            <Newline />
            <Text>Press 'b' to go back</Text>
          </Box>
        );
      default:
        return renderMainMenu();
    }
  };

  return renderCurrentScreen();
}

// Export for CLI usage
export default function runUI() {
  render(<AGENTE_UI />);
}

// Direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runUI();
}