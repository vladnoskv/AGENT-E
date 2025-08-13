#!/usr/bin/env node

import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp, Newline, Spacer } from 'ink';
import chalk from 'chalk';
import { Header } from '../ui/header.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MenuOption = ({ isSelected, children, description }) => (
  <Box flexDirection="row" marginBottom={1}>
    <Text color={isSelected ? '#00ff88' : 'white'}>{isSelected ? '❯ ' : '  '}</Text>
    <Text bold color={isSelected ? '#00ff88' : 'white'}>{children}</Text>
    <Text color="#888888" marginLeft={2}>
      {description}
    </Text>
  </Box>
);

const StatusBar = ({ message, isError = false }) => (
  <Box marginTop={1} borderStyle="round" borderColor={isError ? 'red' : 'green'} paddingX={1}>
    <Text color={isError ? 'red' : 'green'}>{message}</Text>
  </Box>
);

const App = () => {
  const { exit } = useApp();
  const [selectedOption, setSelectedOption] = useState(0);
  const [status, setStatus] = useState({ message: '', isError: false });
  const [isLoading, setIsLoading] = useState(false);
  const [showHeader, setShowHeader] = useState(true);

  const menuOptions = [
    { 
      name: 'Chat Mode', 
      description: 'Interactive conversation with AI',
      command: 'chat',
      args: []
    },
    { 
      name: 'Response Mode', 
      description: 'Get direct AI responses',
      command: 'response',
      args: []
    },
    { 
      name: 'Agent Orchestrator', 
      description: 'Multi-agent task processing',
      command: 'agent',
      args: []
    },
    { 
      name: 'Expert Agents', 
      description: 'Specialized AI experts',
      command: 'expert',
      args: []
    },
    { 
      name: 'Test System', 
      description: 'Run validation tests',
      command: 'test',
      args: []
    },
    { 
      name: 'Update Knowledge', 
      description: 'Refresh expert knowledge bases',
      command: 'update-knowledge',
      args: []
    },
    { 
      name: 'Exit', 
      description: 'Close the application',
      command: 'exit',
      args: []
    }
  ];

  useInput((input, key) => {
    if (key.upArrow || key.k) {
      setSelectedOption(prev => (prev === 0 ? menuOptions.length - 1 : prev - 1));
    } else if (key.downArrow || key.j) {
      setSelectedOption(prev => (prev === menuOptions.length - 1 ? 0 : prev + 1));
    } else if (key.return) {
      handleSelection(selectedOption);
    } else if (key.escape || key.q) {
      exit();
    }
  });

  const handleSelection = (index) => {
    const option = menuOptions[index];
    
    if (option.command === 'exit') {
      exit();
      return;
    }
    
    setStatus({ message: `Launching ${option.name}...`, isError: false });
    setIsLoading(true);
    
    // Hide header when executing
    setShowHeader(false);
    
    // Clear the screen and show a clean output
    process.stdout.write('\x1Bc');
    
    // Execute the selected command
    const child = spawn('node', [
      path.join(__dirname, '..', '..', 'bin', 'AGENT-X.js'),
      option.command,
      ...option.args
    ], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      setIsLoading(false);
      if (code !== 0) {
        setStatus({ 
          message: `❌ ${option.name} exited with code ${code}. Press any key to continue.`, 
          isError: true 
        });
      } else {
        setStatus({ 
          message: `✅ ${option.name} completed successfully. Press any key to continue.`, 
          isError: false 
        });
      }
      // Show header again after command completes
      setShowHeader(true);
    });
  };

  return (
    <Box flexDirection="column" padding={1}>
      {showHeader && <Header />}
      
      <Box flexDirection="column" marginLeft={2} marginTop={1}>
        <Text color="#ffaa00" bold>🛠️  Select an option:</Text>
        <Newline />
        
        {menuOptions.map((option, index) => (
          <MenuOption 
            key={option.name}
            isSelected={selectedOption === index}
            description={option.description}
          >
            {option.name}
          </MenuOption>
        ))}
        
        <Newline />
        
        {status.message && (
          <StatusBar message={status.message} isError={status.isError} />
        )}
        
        <Box marginTop={1}>
          <Text color="#666666" italic>
            ↑/↓: Navigate • Enter: Select • Q/Esc: Exit • Status: {isLoading ? '🔄 Working...' : '✅ Ready'}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

// Main function to run the Ink interface
const runInkInterface = () => {
  render(<App />);
};

export default runInkInterface;

// Allow direct execution (robust main check)
try {
  const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
  if (isMain) {
    runInkInterface();
  }
} catch (_) {
  // Fallback: just run
  runInkInterface()
    .catch(err => {
      console.error('Failed to start interface:', err);
      process.exit(1);
    });
}