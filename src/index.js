#!/usr/bin/env node

import { Command } from 'commander';
import { startServer } from './web/server.js';
import { logger } from './utils/logger.js';
import { readFile } from 'fs/promises';
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));

const program = new Command();

program
  .name('agentx')
  .description('AGENT-X - Multi-agent AI system with NVIDIA integration')
  .version(version, '-v, --version', 'output the current version')
  .option('-d, --debug', 'output extra debugging')
  .option('-c, --config <path>', 'set config path', './config/default.json');

// Web UI command
program
  .command('web')
  .description('Start the web interface')
  .option('-p, --port <port>', 'port to run the server on', '3000')
  .option('-h, --host <host>', 'host to bind the server to', 'localhost')
  .action(async (options) => {
    try {
      await startServer({
        port: parseInt(options.port, 10),
        host: options.host,
        isDev: process.env.NODE_ENV === 'development',
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  });

// Chat command
program
  .command('chat')
  .description('Start an interactive chat session')
  .option('-m, --model <model>', 'model to use for the chat', 'gpt-4')
  .action((options) => {
    console.log(`Starting chat session with model: ${options.model}`);
    // Implement chat functionality here
  });

// Execute command
program
  .command('exec <prompt>')
  .description('Execute a single prompt')
  .option('-m, --model <model>', 'model to use', 'gpt-4')
  .option('-o, --output <file>', 'output file path')
  .action((prompt, options) => {
    console.log(`Executing: ${prompt}`);
    console.log(`Model: ${options.model}`);
    if (options.output) {
      console.log(`Output will be saved to: ${options.output}`);
    }
    // Implement execution logic here
  });

// Version command
program
  .command('version')
  .description('Display version information')
  .action(() => {
    console.log(`AGENT-X v${version}`);
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
  process.exit(1);
});

// Parse command line arguments
async function main() {
  try {
    if (process.argv.length <= 2) {
      // No arguments provided, show help
      program.help();
    } else {
      await program.parseAsync(process.argv);
    }
  } catch (error) {
    logger.error('An error occurred:', error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  logger.fatal('Fatal error:', error);
  process.exit(1);
});
