#!/usr/bin/env node

import React from 'react';
import { render, Text, Box, useInput, useApp, useState, useEffect } from 'ink';
import gradient from 'gradient-string';
import MultiAgentSystem from '../multi-agent.js';
import uiManager from '../utils/ui-manager.js';

// Initialize UI manager with user's preferred language
await uiManager.initialize();

// AGENTX Header Component with i18ntk
const AgentXHeader = () => (
  <Box flexDirection="column" alignItems="center" marginBottom={1}>
    <Text color="cyan">
      {gradient.rainbow.multiline(`
    ███████╗ █████╗ ████████╗██╗  ██╗███████╗
    ██╔════╝██╔══██╗╚══██╔══╝██║  ██║██╔════╝
    █████╗  ███████║   ██║   ███████║█████╗  
    ██╔══╝  ██╔══██║   ██║   ██╔══██║██╔══╝  
    ██║     ██║  ██║   ██║   ██║  ██║███████╗
    ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝
      `)}
    </Text>
    <Text color="yellow" bold>
      {uiManager.t('app.title')} {uiManager.t('app.version')}
    </Text>
    <Text color="gray">
      {uiManager.t('app.welcome')}
    </Text>
  </Box>
);

// Main Menu Component with i18n
const MainMenu = ({ onSelect }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuOptions = [
    { key: 'chat_with_agent', action: 'chat' },
    { key: 'list_agents', action: 'list' },
    { key: 'analyze_codebase', action: 'analyze' },
    { key: 'generate_docs', action: 'docs' },
    { key: 'fix_bugs', action: 'fix' },
    { key: 'security_scan', action: 'security' },
    { key: 'settings', action: 'settings' },
    { key: 'help', action: 'help' }
  ];

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(menuOptions.length - 1, selectedIndex + 1));
    } else if (key.return) {
      onSelect(menuOptions[selectedIndex].action);
    } else if (key.escape || input.toLowerCase() === 'q') {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="cyan" bold>
        {uiManager.t('menu.title')}
      </Text>
      <Text color="gray">
        {uiManager.t('ui.navigation.use_arrow_keys')}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {menuOptions.map((option, index) => (
          <Text key={option.key} color={index === selectedIndex ? 'yellow' : 'white'}>
            {index === selectedIndex ? '▶ ' : '  '}
            {uiManager.t(`menu.options.${option.key}`)}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

// Chat Interface Component with i18n
const ChatInterface = ({ agent, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const agentSystem = new MultiAgentSystem();

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { type: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await agentSystem.chatWithAgent(agent, input);
      const agentMessage = { type: 'agent', text: response };
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      const errorMessage = { 
        type: 'error', 
        text: uiManager.t('chat.error', { agent: agentSystem.getAgentName(agent) }) 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onBack();
    } else if (key.return) {
      handleSend();
    } else if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setInput(prev => prev + input);
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <Text color="cyan" bold>
        {uiManager.t('chat.title', { agent: agentSystem.getAgentName(agent) })}
      </Text>
      <Box flexGrow={1} flexDirection="column" marginTop={1}>
        {messages.map((msg, index) => (
          <Box key={index} marginBottom={1}>
            <Text color={msg.type === 'user' ? 'green' : msg.type === 'error' ? 'red' : 'white'}>
              {msg.type === 'user' ? 'You: ' : `${agentSystem.getAgentName(agent)}: `}
              {msg.text}
            </Text>
          </Box>
        ))}
        {isLoading && (
          <Text color="yellow">
            {uiManager.t('chat.thinking', { agent: agentSystem.getAgentName(agent) })}
          </Text>
        )}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">
          {uiManager.t('chat.prompt')}
        </Text>
        <Text color="white">{input}</Text>
        <Text color="gray">_</Text>
      </Box>
    </Box>
  );
};

// Settings Component with i18n
const SettingsMenu = ({ onBack }) => {
  const [languages] = useState(uiManager.getAvailableLanguages());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentLang] = useState(uiManager.getCurrentLanguage());

  useInput((input, key) => {
    if (key.escape) {
      onBack();
    } else if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(languages.length - 1, selectedIndex + 1));
    } else if (key.return) {
      const selectedLang = languages[selectedIndex].code;
      uiManager.changeLanguage(selectedLang).then(() => {
        console.log(uiManager.t('settings.restart_required'));
        process.exit(0);
      });
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>
        {uiManager.t('settings.title')}
      </Text>
      <Text color="gray">
        {uiManager.t('settings.current_language', { 
          language: languages.find(l => l.code === currentLang)?.name || currentLang 
        })}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {languages.map((lang, index) => (
          <Text key={lang.code} color={index === selectedIndex ? 'yellow' : 'white'}>
            {index === selectedIndex ? '▶ ' : '  '}
            {lang.name}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

// Loading Component with i18n
const LoadingScreen = ({ operation }) => (
  <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
    <Text color="cyan">
      {uiManager.t('progress.starting', { operation })}
    </Text>
    <Text color="yellow">
      {uiManager.t('ui.loading.text')}
    </Text>
  </Box>
);

// Main App Component with i18n
const App = () => {
  const [screen, setScreen] = useState('menu');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleMenuSelect = async (action) => {
    switch (action) {
      case 'chat':
        setScreen('agent-select');
        break;
      case 'list':
        console.log('\n' + uiManager.t('agents.title'));
        const agents = [
          { key: 'master', name: uiManager.t('agents.master.name'), desc: uiManager.t('agents.master.description') },
          { key: 'code_analyzer', name: uiManager.t('agents.code_analyzer.name'), desc: uiManager.t('agents.code_analyzer.description') },
          { key: 'documentation_writer', name: uiManager.t('agents.documentation_writer.name'), desc: uiManager.t('agents.documentation_writer.description') },
          { key: 'bug_fixer', name: uiManager.t('agents.bug_fixer.name'), desc: uiManager.t('agents.bug_fixer.description') },
          { key: 'architect', name: uiManager.t('agents.architect.name'), desc: uiManager.t('agents.architect.description') },
          { key: 'security_expert', name: uiManager.t('agents.security_expert.name'), desc: uiManager.t('agents.security_expert.description') }
        ];
        
        agents.forEach(agent => {
          console.log(`\n${agent.name}`);
          console.log(`  ${agent.desc}`);
        });
        
        setTimeout(() => setScreen('menu'), 3000);
        break;
      case 'settings':
        setScreen('settings');
        break;
      case 'help':
        console.log('\n' + uiManager.t('menu.options.help'));
        console.log(uiManager.t('ui.navigation.use_arrow_keys'));
        console.log(uiManager.t('ui.navigation.press_enter'));
        console.log(uiManager.t('ui.navigation.press_esc'));
        setTimeout(() => setScreen('menu'), 3000);
        break;
      default:
        console.log(`Action: ${action} - ${uiManager.t('progress.starting', { operation: action })}`);
        setTimeout(() => setScreen('menu'), 2000);
    }
  };

  const handleAgentSelect = (agentKey) => {
    setSelectedAgent(agentKey);
    setScreen('chat');
  };

  // Agent Selection Screen
  if (screen === 'agent-select') {
    return (
      <AgentSelection 
        onSelect={handleAgentSelect}
        onBack={() => setScreen('menu')}
      />
    );
  }

  // Chat Screen
  if (screen === 'chat' && selectedAgent) {
    return (
      <ChatInterface 
        agent={selectedAgent} 
        onBack={() => setScreen('menu')} 
      />
    );
  }

  // Settings Screen
  if (screen === 'settings') {
    return <SettingsMenu onBack={() => setScreen('menu')} />;
  }

  // Loading Screen
  if (isLoading) {
    return <LoadingScreen operation={uiManager.t('app.loading')} />;
  }

  // Main Menu
  return (
    <Box flexDirection="column">
      <AgentXHeader />
      <MainMenu onSelect={handleMenuSelect} />
    </Box>
  );
};

// Agent Selection Component with i18n
const AgentSelection = ({ onSelect, onBack }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const agents = [
    { key: 'master', name: uiManager.t('agents.master.name') },
    { key: 'code_analyzer', name: uiManager.t('agents.code_analyzer.name') },
    { key: 'documentation_writer', name: uiManager.t('agents.documentation_writer.name') },
    { key: 'bug_fixer', name: uiManager.t('agents.bug_fixer.name') },
    { key: 'architect', name: uiManager.t('agents.architect.name') },
    { key: 'security_expert', name: uiManager.t('agents.security_expert.name') }
  ];

  useInput((input, key) => {
    if (key.escape) {
      onBack();
    } else if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(agents.length - 1, selectedIndex + 1));
    } else if (key.return) {
      onSelect(agents[selectedIndex].key);
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>
        {uiManager.t('agents.title')}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {agents.map((agent, index) => (
          <Text key={agent.key} color={index === selectedIndex ? 'yellow' : 'white'}>
            {index === selectedIndex ? '▶ ' : '  '}
            {agent.name}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

// CLI Entry Point with i18n
async function main() {
  const args = process.argv.slice(2);

  // Handle command line arguments
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${uiManager.t('app.title')} ${uiManager.t('app.version')}

${uiManager.t('app.welcome')}

${uiManager.t('menu.options.chat_with_agent')}:
  agentx --chat [agent-name]

${uiManager.t('menu.options.list_agents')}:
  agentx --list

${uiManager.t('menu.options.analyze_codebase')}:
  agentx --analyze [path]

${uiManager.t('settings.title')}:
  agentx --settings

${uiManager.t('settings.language')}:
  AGENTX_LANG=es agentx
    `);
    return;
  }

  if (args.includes('--list')) {
    console.log('\n' + uiManager.t('agents.title'));
    const agents = [
      { key: 'master', name: uiManager.t('agents.master.name'), desc: uiManager.t('agents.master.description') },
      { key: 'code_analyzer', name: uiManager.t('agents.code_analyzer.name'), desc: uiManager.t('agents.code_analyzer.description') },
      { key: 'documentation_writer', name: uiManager.t('agents.documentation_writer.name'), desc: uiManager.t('agents.documentation_writer.description') },
      { key: 'bug_fixer', name: uiManager.t('agents.bug_fixer.name'), desc: uiManager.t('agents.bug_fixer.description') },
      { key: 'architect', name: uiManager.t('agents.architect.name'), desc: uiManager.t('agents.architect.description') },
      { key: 'security_expert', name: uiManager.t('agents.security_expert.name'), desc: uiManager.t('agents.security_expert.description') }
    ];
    
    agents.forEach(agent => {
      console.log(`\n${agent.name}`);
      console.log(`  ${agent.desc}`);
    });
    return;
  }

  if (args.includes('--settings')) {
    console.log(uiManager.t('settings.title'));
    console.log(uiManager.t('settings.current_language', { 
      language: uiManager.getAvailableLanguages().find(l => l.code === uiManager.getCurrentLanguage())?.name || uiManager.getCurrentLanguage()
    }));
    console.log(`\n${uiManager.t('settings.select_language')}:`);
    uiManager.getAvailableLanguages().forEach(lang => {
      console.log(`  ${lang.code}: ${lang.name}`);
    });
    return;
  }

  // Check for language override from environment
  const envLang = process.env.AGENTX_LANG || process.env.LANG?.split('_')[0];
  if (envLang && uiManager.supportedLanguages.includes(envLang)) {
    await uiManager.changeLanguage(envLang);
  }

  // Run interactive UI
  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}

// Handle direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(uiManager.t('errors.general', { error: error.message }));
    process.exit(1);
  });
}

export default main;