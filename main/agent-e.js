#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

function displayHeader() {
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
  console.log(chalk.hex('#ffaa00').bold(`🚀 AGENT-E v1.0.0`));
  console.log(chalk.hex('#888888')(`Powered by NVIDIA GPT-OSS-20B`));
  console.log(chalk.gray('────────────────────────────────────────────────────'));
  console.log('');
}

program
  .name('agent-e')
  .description('AGENT-E CLI - Multi-agent AI toolkit')
  .version('1.0.0');

program
  .command('chat')
  .description('Start interactive chat mode')
  .action(async () => {
    displayHeader();
    console.log(chalk.blue('🤖 Starting AGENT-E Chat Mode...'));
    
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Choose interaction mode:',
        choices: [
          { name: 'Single Agent', value: 'single' },
          { name: 'Multi-Agent', value: 'multi' },
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);

    if (mode === 'exit') {
      console.log(chalk.green('Goodbye!'));
      process.exit(0);
    }

    if (mode === 'single') {
      console.log(chalk.yellow('Launching single agent mode...'));
      // Import and run single agent
      try {
        const { default: singleAgent } = await import('./agent.js');
        await singleAgent();
      } catch (error) {
        console.error(chalk.red('Error launching single agent:'), error.message);
      }
    } else if (mode === 'multi') {
      console.log(chalk.yellow('Launching multi-agent mode...'));
      // Import and run multi-agent
      try {
        const { default: multiAgent } = await import('./multi-agent.js');
        await multiAgent();
      } catch (error) {
        console.error(chalk.red('Error launching multi-agent:'), error.message);
      }
    }
  });

program
  .command('agent')
  .description('Run specific agent')
  .argument('<agent-name>', 'Name of the agent to run')
  .action(async (agentName) => {
    displayHeader();
    console.log(chalk.blue(`🤖 Starting agent: ${agentName}`));
    
    try {
      const { default: agent } = await import('./agent.js');
      await agent(agentName);
    } catch (error) {
      console.error(chalk.red(`Error running agent ${agentName}:`), error.message);
    }
  });

program
  .command('demo')
  .description('Run multi-agent demo')
  .action(async () => {
    displayHeader();
    console.log(chalk.blue('🤖 Starting Multi-Agent Demo...'));
    
    try {
      const { default: multiAgent } = await import('./multi-agent.js');
      await multiAgent('demo');
    } catch (error) {
      console.error(chalk.red('Error running demo:'), error.message);
    }
  });

program
  .command('ui')
  .description('Launch interactive UI')
  .action(async () => {
    displayHeader();
    console.log(chalk.blue('🤖 Launching Interactive UI...'));
    
    try {
      const { default: ui } = await import('./agent-e-i18n.js');
      await ui();
    } catch (error) {
      console.error(chalk.red('Error launching UI:'), error.message);
      console.log(chalk.yellow('Note: UI mode requires ink/terminal support'));
    }
  });

// Default action when no command is provided
program.action(async () => {
  displayHeader();
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '🗣️  Interactive Chat', value: 'chat' },
        { name: '🤖 Run Agent', value: 'agent' },
        { name: '👥 Multi-Agent Demo', value: 'demo' },
        { name: '🖥️  Launch UI', value: 'ui' },
        { name: '❓ Help', value: 'help' },
        { name: '🚪 Exit', value: 'exit' }
      ]
    }
  ]);

  switch (action) {
    case 'chat':
      await program.commands.find(cmd => cmd.name() === 'chat').action();
      break;
    case 'agent':
      const { agentName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'agentName',
          message: 'Enter agent name:',
          default: 'research'
        }
      ]);
      await program.commands.find(cmd => cmd.name() === 'agent').action(agentName);
      break;
    case 'demo':
      await program.commands.find(cmd => cmd.name() === 'demo').action();
      break;
    case 'ui':
      await program.commands.find(cmd => cmd.name() === 'ui').action();
      break;
    case 'help':
      program.help();
      break;
    case 'exit':
      console.log(chalk.green('Goodbye!'));
      process.exit(0);
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});

program.parse();