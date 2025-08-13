#!/usr/bin/env node

import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp, Newline } from 'ink';
import chalk from 'chalk';
import { Header } from './header.js';

// Ink-based CLI Interface
const App = () => {
    const { exit } = useApp();
    const [selectedOption, setSelectedOption] = useState(0);
    const [showHeader, setShowHeader] = useState(true);

    const menuOptions = [
        { name: 'Chat Mode', description: 'Interactive conversation with AI' },
        { name: 'Response Mode', description: 'Direct response API' },
        { name: 'Agent Orchestrator', description: 'Multi-agent processing' },
        { name: 'Test System', description: 'Validate functionality' },
        { name: 'Expert Agents', description: 'Hyper-specialized experts' },
        { name: 'Knowledge Updates', description: 'Update expert knowledge' },
        { name: 'Exit', description: 'Close application' }
    ];

    useInput((input, key) => {
        if (key.upArrow) {
            setSelectedOption(prev => (prev === 0 ? menuOptions.length - 1 : prev - 1));
        } else if (key.downArrow) {
            setSelectedOption(prev => (prev === menuOptions.length - 1 ? 0 : prev + 1));
        } else if (key.return) {
            handleSelection(selectedOption);
        } else if (key.escape) {
            exit();
        }
    });

    const handleSelection = async (index) => {
        const option = menuOptions[index];
        
        // Hide header when executing
        setShowHeader(false);
        
        console.log(chalk.yellow(`\n🚀 Launching ${option.name}...\n`));
        
        // Execute the appropriate script
        const { spawn } = await import('child_process');
        const { fileURLToPath } = await import('url');
        const { dirname, join } = await import('path');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        
        let script;
        switch (index) {
            case 0: script = 'chat.js'; break;
            case 1: script = 'response.js'; break;
            case 2: script = 'agent-orchestrator.js'; break;
            case 3: script = 'test-agent-system.js'; break;
            case 4: script = 'expert-agent-system.js'; break;
            case 5: script = 'knowledge-updater.js'; break;
            case 6: exit(); return;
        }
        
        const child = spawn('node', [join(__dirname, script)], {
            stdio: 'inherit'
        });
        
        child.on('close', () => {
            exit();
        });
    };

    return (
        <Box flexDirection="column">
            {showHeader && <Header />}
            
            <Box flexDirection="column" marginLeft={2}>
                <Text color="#ffaa00" bold>
                    🎯 Select an option:
                </Text>
                <Newline />
                
                {menuOptions.map((option, index) => (
                    <Box key={index} marginBottom={1}>
                        <Text color={selectedOption === index ? '#00ff88' : '#ffffff'}>
                            {selectedOption === index ? '▶ ' : '  '}
                            {option.name}
                        </Text>
                        <Text color="#888888" marginLeft={2}>
                            - {option.description}
                        </Text>
                    </Box>
                ))}
                
                <Newline />
                <Text color="#666666" italic>
                    Use ↑↓ arrows to navigate, Enter to select, ESC to exit
                </Text>
            </Box>
        </Box>
    );
};

// Main function to run the Ink interface
const runInkInterface = () => {
    render(<App />);
};

export default runInkInterface;

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
    runInkInterface();
}