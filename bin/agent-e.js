#!/usr/bin/env node

import chalk from 'chalk';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Display fixed header
const displayHeader = () => {
    console.log(`
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║   █████╗  ██████╗ ███████╗███╗   ██╗██╗  ██╗███████╗        ║
    ║  ██╔══██╗██╔═══██╗██╔════╝████╗  ██║██║ ██╔╝██╔════╝        ║
    ║  ███████║██║   ██║█████╗  ██╔██╗ ██║█████╔╝ █████╗          ║
    ║  ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║██╔═██╗ ██╔══╝          ║
    ║  ██║  ██║╚██████╔╝███████╗██║ ╚████║██║  ██╗███████╗        ║
    ║  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝        ║
    ║                                                               ║
    ║  ████████╗ ██████╗ ███╗   ███╗██████╗ ██╗     ███████╗     ║
    ║  ╚══██╔══╝██╔═══██╗████╗ ████║██╔══██╗██║     ██╔════╝     ║
    ║     ██║   ██║   ██║██╔████╔██║██████╔╝██║     █████╗       ║
    ║     ██║   ██║   ██║██║╚██╔╝██║██╔═══╝ ██║     ██╔══╝       ║
    ║     ██║   ╚██████╔╝██║ ╚═╝ ██║██║     ███████╗███████╗     ║
    ║     ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚══════╝╚══════╝     ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
    `);
    console.log(chalk.hex('#ffaa00').bold(`🚀 AGENT-X v0.0.1 (alpha)`));
    console.log(chalk.hex('#888888')(`Powered by NVIDIA GPT-OSS-20B`));
    console.log(chalk.hex('#444444')('════════════════════════════════════════════════════════════════'));
    console.log();
};

function showHelp() {
    displayHeader();
    console.log(chalk.blue.bold('Usage: AGENT-X <command>'));
    console.log('');
    console.log('Commands:');
    console.log('  ui        - Start the Ink-based UI');
    console.log('  chat      - Start interactive chat mode');
    console.log('  response  - Get direct response');
    console.log('  menu      - Show interactive menu');
    console.log('  agent     - Multi-agent orchestrator');
    console.log('  expert    - Hyper-expert AI agents');
    console.log('  test      - Run legacy test suite');
    console.log('  update-knowledge - Update expert knowledge');
    console.log('  help      - Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  AGENT-X chat');
    console.log('  AGENT-X response "What is Node.js?"');
    console.log('  AGENT-X menu');
    console.log('  AGENT-X expert');
}

function runCommand(command, args = []) {
    const commandMap = {
        'ui': join(__dirname, '..', 'src', 'commands', 'ink-interface.jsx'),
        'chat': join(__dirname, '..', 'src', 'commands', 'chat.js'),
        'response': join(__dirname, '..', 'src', 'commands', 'response.js'),
        'menu': join(__dirname, '..', 'src', 'commands', 'menu.js'),
        'agent': join(__dirname, '..', 'src', 'core', 'orchestrators', 'agent-orchestrator.js'),
        'expert': join(__dirname, '..', 'src', 'agents', 'expert', 'hyper-expert-orchestrator.js'),
        'test': join(__dirname, '..', 'src', 'scripts', 'test-agent-system.js'),
        'update-knowledge': join(__dirname, '..', 'src', 'knowledge', 'knowledge-updater.js'),
        'mcp': join(__dirname, '..', 'src', 'core', 'mcp', 'mcp-server.js')
    };

    if (command === 'help' || !commandMap[command]) {
        showHelp();
        process.exit(0);
    }

    const scriptPath = commandMap[command];
    
    if (args.length > 0) {
        spawn('node', [scriptPath, ...args], {
            stdio: 'inherit',
            cwd: process.cwd()
        });
    } else {
        spawn('node', [scriptPath], {
            stdio: 'inherit',
            cwd: process.cwd()
        });
    }
}

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
    // Default to Ink UI for better UX
    runCommand('ui', []);
} else {
    runCommand(command, args);
}