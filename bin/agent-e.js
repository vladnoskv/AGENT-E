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
    console.log(chalk.hex('#ffaa00').bold(`🚀 AGENT-E v0.0.1 (alpha)`));
    console.log(chalk.hex('#888888')(`Powered by NVIDIA GPT-OSS-20B`));
    console.log(chalk.hex('#444444')('════════════════════════════════════════════════════════════════'));
    console.log();
};

function showHelp() {
    displayHeader();
    console.log(chalk.blue.bold('Usage: agent-e <command>'));
    console.log('');
    console.log('Commands:');
    console.log('  chat      - Start interactive chat mode');
    console.log('  response  - Get direct response');
    console.log('  menu      - Show interactive menu');
    console.log('  agent     - Multi-agent orchestrator');
    console.log('  expert    - Hyper-expert AI agents');
    console.log('  help      - Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  agent-e chat');
    console.log('  agent-e response "What is Node.js?"');
    console.log('  agent-e menu');
    console.log('  agent-e expert');
}

function runCommand(command, args = []) {
    const commandMap = {
        'chat': './src/commands/chat.js',
        'response': './src/commands/response.js',
        'menu': './src/commands/menu.js',
        'agent': './src/agents/orchestrator.js',
        'expert': './src/agents/expert-system.js'
    };

    if (command === 'help' || !commandMap[command]) {
        showHelp();
        process.exit(0);
    }

    const scriptPath = join(__dirname, '..', commandMap[command]);
    
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
    showHelp();
    process.exit(0);
}

runCommand(command, args);