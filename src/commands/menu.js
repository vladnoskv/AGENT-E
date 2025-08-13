#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BANNER_BLOCK = String.raw`
 █████╗   ██████╗ ███████╗███╗   ██╗████████╗██╗  ██╗
██╔══██╗ ██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██║  ██║
███████║ ██║  ███╗█████╗  ██╔██╗ ██║   ██║   ███████║
██╔══██║ ██║   ██║██╔══╝  ██║╚██╗██║   ██║   ██╔══██║
██║  ██║ ╚██████╔╝███████╗██║ ╚████║   ██║   ██║  ██║
╚═╝  ╚═╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝
                  ██╗  ██╗
                   ╚██╗██╔╝
                    ╚███╔╝ 
                    ██╔██╗ 
                   ██╔╝ ██╗
                   ╚═╝  ╚═╝
`;

const displayHeader = () => {
  console.log(chalk.hex("#00ff88")(BANNER_BLOCK));
  console.log(chalk.hex("#ffaa00").bold("🚀 AGENT-E v0.0.1 (alpha)"));
  console.log(chalk.hex("#888888")("Powered by NVIDIA GPT-OSS-20B"));
  console.log(chalk.hex("#444444")("──────────────────────────────────────────────────────────────"));
  console.log();
};

const menuOptions = [
  { name: '🗣️  Chat Mode', description: 'Interactive conversation with AI', action: 'chat' },
  { name: '🤖 Response Mode', description: 'Direct response API', action: 'response' },
  { name: '👥 Agent Orchestrator', description: 'Multi-agent task processing', action: 'agent' },
  { name: '🧪 Test System', description: 'Validate functionality', action: 'test' },
  { name: '🎯 Expert Agents', description: 'Hyper-specialized experts', action: 'expert' },
  { name: '📚 Knowledge Updates', description: 'Update expert knowledge', action: 'update-knowledge' },
  { name: '🚪 Exit', description: 'Close application', action: 'exit' }
];
const runScript = (scriptName) => {
  const scriptMap = {
    'setup': join(__dirname, 'setup-task.js'),
    'chat': join(__dirname, 'chat.js'),
    'response': join(__dirname, 'response.js'),
    'index': join(__dirname, 'index-codebase.js'),
    'agent': join(__dirname, '..', '..', 'src', 'core', 'orchestrators', 'agent-orchestrator.js'),
    'expert': join(__dirname, '..', '..', 'src', 'agents', 'expert', 'hyper-expert-orchestrator.js'),
    'test': join(__dirname, '..', '..', 'src', 'scripts', 'test-agent-system.js'),
    'update-knowledge': join(__dirname, '..', '..', 'src', 'knowledge', 'knowledge-updater.js')
  };

  const scriptPath = scriptMap[scriptName];
  if (!scriptPath) {
    console.error(chalk.red(`Unknown script: ${scriptName}`));
    return;
  }

  console.log(chalk.yellow(`\n🚀 Launching ${scriptName}...\n`));
  const child = spawn('node', [scriptPath], { stdio: 'inherit', shell: true });
  child.on('close', (code) => {
    if (code !== 0) {
      console.error(chalk.red(`\n❌ Script exited with code ${code}`));
    } else {
      console.log(chalk.green(`\n✅ ${scriptName} completed.`));
    }
    // Return to menu
    showMenu();
  });
};

export const showMenu = async () => {
  console.log(chalk.cyan.bold('AGENT-E Menu'));
  console.log(chalk.gray('Select an option:\n'));

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'What would you like to do?',
      choices: [
        { name: 'Setup Task', value: 'setup' },
        { name: 'Chat Mode', value: 'chat' },
        { name: 'Response Mode', value: 'response' },
        { name: 'Agent Orchestrator', value: 'agent' },
        { name: 'Index Codebase', value: 'index' },
        { name: 'Test System', value: 'test' },
        { name: 'Expert Agents', value: 'expert' },
        { name: 'Knowledge Updates', value: 'update-knowledge' },
        new inquirer.Separator(),
        { name: 'Exit', value: 'exit' },
      ],
      pageSize: 10
    }
  ]);

  if (choice === 'exit') {
    console.log(chalk.yellow('👋 Goodbye!'));
    process.exit(0);
  }

  return runScript(choice);
};

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(chalk.green('\n\nGoodbye!'));
  process.exit(0);
});

// Main execution (robust main check for Windows/Unix)
try {
  const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
  if (isMain) {
    showMenu();
  }
} catch (_) {
  // Fallback: just run
  showMenu();
}

export default showMenu;