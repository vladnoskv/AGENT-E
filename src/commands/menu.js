#!/usr/bin/env node

import { createInterface } from 'readline';
import chalk from 'chalk';
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
    'chat': '../../../chat.js',
    'response': '../../../response.js',
    'agent': '../../../agent-orchestrator.js',
    'test': '../../../test-agent-system.js',
    'expert': '../../../expert-agent-system.js',
    'update-knowledge': '../../../knowledge-updater.js'
  };

  if (scriptName === 'exit') {
    console.log(chalk.green('Goodbye!'));
    process.exit(0);
  }

  const scriptPath = join(__dirname, scriptMap[scriptName]);
  
  console.log(chalk.yellow(`\n🚀 Launching ${menuOptions.find(opt => opt.action === scriptName)?.name || scriptName}...\n`));
  
  const child = spawn('node', [scriptPath], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green('\n✅ Operation completed successfully!'));
      setTimeout(() => {
        showMenu();
      }, 1000);
    } else {
      console.log(chalk.red(`\n❌ Process exited with code ${code}`));
      setTimeout(() => {
        showMenu();
      }, 2000);
    }
  });

  child.on('error', (error) => {
    console.error(chalk.red(`Error: ${error.message}`));
    setTimeout(() => {
      showMenu();
    }, 2000);
  });
};

const showMenu = () => {
  displayHeader();
  
  console.log(chalk.cyan.bold('🎯 Select an option:'));
  console.log();
  
  menuOptions.forEach((option, index) => {
    console.log(chalk.white(`${index + 1}. ${option.name}`));
    console.log(chalk.gray(`   ${option.description}`));
    console.log();
  });
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question(chalk.cyan('Enter your choice (1-7): '), (answer) => {
    const choice = parseInt(answer.trim());
    
    if (isNaN(choice) || choice < 1 || choice > menuOptions.length) {
      console.log(chalk.red('❌ Invalid choice. Please try again.'));
      setTimeout(() => {
        rl.close();
        showMenu();
      }, 1000);
      return;
    }
    
    const selectedOption = menuOptions[choice - 1];
    rl.close();
    
    if (selectedOption.action === 'exit') {
      console.log(chalk.green('Goodbye!'));
      process.exit(0);
    } else {
      runScript(selectedOption.action);
    }
  });
};

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(chalk.green('\n\nGoodbye!'));
  process.exit(0);
});

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  showMenu();
}

export default showMenu;