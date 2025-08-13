#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import ora from 'ora';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

class NvidiaGPTCLI {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.api_key?.replace(/"/g, '').trim(),
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });
    this.program = new Command();
    this.setupCommands();
  }

  setupCommands() {
    this.program
      .name('nvidia-gpt')
      .description('CLI tool for NVIDIA GPT-OSS-20B API with file operations')
      .version('1.0.0');

    this.program
      .command('chat')
      .description('Start an interactive chat session')
      .action(() => this.startChat());

    this.program
      .command('ask <question>')
      .description('Ask a single question')
      .option('-f, --file <path>', 'Include file content in the question')
      .action((question, options) => this.askQuestion(question, options));

    this.program
      .command('files')
      .description('List and manage files')
      .option('-l, --list [pattern]', 'List files matching pattern', '*.js,*.md,*.json,*.py,*.txt')
      .option('-r, --read <path>', 'Read a file')
      .option('-e, --edit <path>', 'Edit a file')
      .option('-d, --delete <path>', 'Delete a file')
      .action((options) => this.manageFiles(options));

    this.program
      .command('mcp')
      .description('MCP (Model Context Protocol) operations')
      .option('-c, --context <path>', 'Add file/directory to context')
      .option('-r, --read-context', 'Read current context')
      .action((options) => this.handleMCP(options));

    this.program
      .command('config')
      .description('Show current configuration')
      .action(() => this.showConfig());
  }

  async startChat() {
    console.log(chalk.blue.bold('\n🤖 NVIDIA GPT-OSS-20B Chat\n'));
    console.log(chalk.gray('Type "exit" to quit, "help" for commands\n'));

    const context = [];
    
    while (true) {
      const { message } = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: chalk.green('You:'),
          validate: (input) => input.trim().length > 0 || 'Please enter a message'
        }
      ]);

      if (message.toLowerCase() === 'exit') {
        console.log(chalk.yellow('Goodbye!'));
        break;
      }

      if (message.toLowerCase() === 'help') {
        this.showChatHelp();
        continue;
      }

      if (message.startsWith('/file ')) {
        const filePath = message.slice(6).trim();
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          context.push({ role: 'user', content: `File: ${filePath}\n\n${content}` });
          console.log(chalk.gray(`Added ${filePath} to context`));
          continue;
        } catch (error) {
          console.log(chalk.red(`Error reading file: ${error.message}`));
          continue;
        }
      }

      context.push({ role: 'user', content: message });
      
      try {
        await this.streamResponse(context);
      } catch (error) {
        console.log(chalk.red(`Error: ${error.message}`));
      }
    }
  }

  async askQuestion(question, options) {
    const spinner = ora('Thinking...').start();
    
    try {
      let content = question;
      
      if (options.file) {
        const fileContent = await fs.readFile(options.file, 'utf-8');
        content = `Question about file ${options.file}:\n${question}\n\nFile content:\n${fileContent}`;
      }

      const systemPrompt = `You are GPT-OSS-20B, an AI assistant integrated into the NVIDIA GPT-OSS-20B CLI tool. This CLI tool provides:
- Interactive chat sessions with file context support
- Single question mode with optional file inclusion
- File management (list, read, edit, delete)
- MCP (Model Context Protocol) support for codebase context
- Configuration management

Current working directory: ${process.cwd()}
Available commands: chat, ask, files, mcp, config

When asked about CLI features or capabilities, describe these features comprehensively.`;

      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content }
        ],
        max_tokens: 4096,
        temperature: 0.7,
        stream: false
      });

      spinner.stop();
      console.log(chalk.blue('\n🤖 Assistant:'));
      console.log(completion.choices[0].message.content);
    } catch (error) {
      spinner.stop();
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }

  async manageFiles(options) {
    if (options.list) {
      const pattern = options.list === true ? '*.js,*.md,*.json,*.py,*.txt' : options.list;
      const files = await glob(pattern, { cwd: process.cwd() });
      
      console.log(chalk.blue('\n📁 Files:'));
      files.forEach((file, index) => {
        console.log(`${chalk.gray(`${index + 1}.`)} ${file}`);
      });
    }

    if (options.read) {
      try {
        const content = await fs.readFile(options.read, 'utf-8');
        console.log(chalk.blue(`\n📄 ${options.read}:`));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(content);
      } catch (error) {
        console.log(chalk.red(`Error reading file: ${error.message}`));
      }
    }

    if (options.edit) {
      await this.editFile(options.edit);
    }

    if (options.delete) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete ${options.delete}?`,
          default: false
        }
      ]);

      if (confirm) {
        try {
          await fs.remove(options.delete);
          console.log(chalk.green(`Deleted: ${options.delete}`));
        } catch (error) {
          console.log(chalk.red(`Error deleting file: ${error.message}`));
        }
      }
    }
  }

  async editFile(filePath) {
    try {
      let content = '';
      if (await fs.pathExists(filePath)) {
        content = await fs.readFile(filePath, 'utf-8');
      }

      const { newContent } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'newContent',
          message: `Edit ${filePath}:`,
          default: content
        }
      ]);

      await fs.writeFile(filePath, newContent);
      console.log(chalk.green(`Saved: ${filePath}`));
    } catch (error) {
      console.log(chalk.red(`Error editing file: ${error.message}`));
    }
  }

  async handleMCP(options) {
    const contextFile = path.join(process.cwd(), '.mcp-context.json');

    if (options.context) {
      let currentContext = [];
      if (await fs.pathExists(contextFile)) {
        currentContext = await fs.readJson(contextFile);
      }

      const stats = await fs.stat(options.context);
      const newContext = {
        path: options.context,
        type: stats.isDirectory() ? 'directory' : 'file',
        added: new Date().toISOString()
      };

      currentContext.push(newContext);
      await fs.writeJson(contextFile, currentContext, { spaces: 2 });
      console.log(chalk.green(`Added ${options.context} to MCP context`));
    }

    if (options.readContext) {
      if (await fs.pathExists(contextFile)) {
        const context = await fs.readJson(contextFile);
        console.log(chalk.blue('\n📋 MCP Context:'));
        context.forEach((item, index) => {
          console.log(`${chalk.gray(`${index + 1}.`)} ${item.type}: ${item.path}`);
        });
      } else {
        console.log(chalk.yellow('No MCP context found'));
      }
    }
  }

  async streamResponse(messages) {
    const systemPrompt = `You are GPT-OSS-20B, an AI assistant integrated into the NVIDIA GPT-OSS-20B CLI tool. This CLI tool provides:
- Interactive chat sessions with file context support
- Single question mode with optional file inclusion
- File management (list, read, edit, delete)
- MCP (Model Context Protocol) support for codebase context
- Configuration management

Current working directory: ${process.cwd()}
Available commands: chat, ask, files, mcp, config

When asked about CLI features or capabilities, describe these features comprehensively.`;

    // Ensure system message is included in chat messages
    const enhancedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(msg => msg.role !== 'system')
    ];

    const completion = await this.openai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: enhancedMessages,
      max_tokens: 4096,
      temperature: 0.7,
      stream: true
    });

    process.stdout.write(chalk.blue('\n🤖 Assistant: '));
    
    let fullResponse = '';
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      process.stdout.write(content);
      fullResponse += content;
    }
    
    console.log('\n');
    messages.push({ role: 'assistant', content: fullResponse });
  }

  showChatHelp() {
    console.log(chalk.yellow('\n📖 Chat Commands:'));
    console.log('  /file <path>  - Add file content to context');
    console.log('  help          - Show this help');
    console.log('  exit          - Quit chat\n');
  }

  showConfig() {
    console.log(chalk.blue('\n⚙️  Configuration:'));
    console.log(`API Key: ${process.env.api_key ? '✅ Set' : '❌ Missing'}`);
    console.log(`Base URL: https://integrate.api.nvidia.com/v1`);
    console.log(`Model: openai/gpt-oss-20b`);
    console.log(`Working Directory: ${process.cwd()}`);
  }

  async run() {
    if (!process.env.api_key) {
      console.log(chalk.red('Error: API key not found in .env file'));
      process.exit(1);
    }

    await this.program.parseAsync(process.argv);
    
    if (process.argv.length === 2) {
      console.log(chalk.blue.bold('\n🤖 NVIDIA GPT-OSS-20B CLI\n'));
      this.program.help();
    }
  }
}

const cli = new NvidiaGPTCLI();
cli.run().catch(console.error);