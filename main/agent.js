#!/usr/bin/env node

import OpenAI from 'openai';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import { WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

class AIAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.api_key?.replace(/"/g, '').trim(),
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });
    this.tools = this.getAvailableTools();
    this.conversation = [];
  }

  getAvailableTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'scan_directory',
          description: 'Scan a directory and return file structure with metadata',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Directory path to scan' },
              pattern: { type: 'string', description: 'File pattern to match (optional)' },
              maxDepth: { type: 'number', description: 'Maximum depth to scan (optional)' }
            },
            required: ['path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'read_file',
          description: 'Read and return the contents of a file',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path to read' },
              lineStart: { type: 'number', description: 'Start line number (optional)' },
              lineEnd: { type: 'number', description: 'End line number (optional)' }
            },
            required: ['path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'write_file',
          description: 'Write content to a file (creates directories if needed)',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path to write' },
              content: { type: 'string', description: 'Content to write' },
              createBackup: { type: 'boolean', description: 'Create backup before writing' }
            },
            required: ['path', 'content']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'edit_file',
          description: 'Edit a file by replacing content between line numbers',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path to edit' },
              lineStart: { type: 'number', description: 'Start line number' },
              lineEnd: { type: 'number', description: 'End line number' },
              newContent: { type: 'string', description: 'New content to insert' }
            },
            required: ['path', 'lineStart', 'lineEnd', 'newContent']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_files',
          description: 'Search for files containing specific patterns or text',
          parameters: {
            type: 'object',
            properties: {
              pattern: { type: 'string', description: 'Search pattern (glob or regex)' },
              searchText: { type: 'string', description: 'Text to search within files' },
              path: { type: 'string', description: 'Directory to search in' },
              fileType: { type: 'string', description: 'File extension filter (e.g., .js, .py)' }
            },
            required: ['path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'run_command',
          description: 'Execute a shell command and return output',
          parameters: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'Command to execute' },
              workingDir: { type: 'string', description: 'Working directory (optional)' },
              timeout: { type: 'number', description: 'Timeout in milliseconds (optional)' }
            },
            required: ['command']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_directory',
          description: 'Create a new directory structure',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Directory path to create' }
            },
            required: ['path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'delete_file',
          description: 'Delete a file or directory',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to delete' },
              recursive: { type: 'boolean', description: 'Delete recursively (for directories)' }
            },
            required: ['path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_file_info',
          description: 'Get detailed file/directory information',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File or directory path' }
            },
            required: ['path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'find_and_replace',
          description: 'Find and replace text in files',
          parameters: {
            type: 'object',
            properties: {
              pattern: { type: 'string', description: 'Pattern to search for' },
              replacement: { type: 'string', description: 'Replacement text' },
              path: { type: 'string', description: 'File path' },
              regex: { type: 'boolean', description: 'Use regex for pattern matching' }
            },
            required: ['path', 'pattern', 'replacement']
          }
        }
      }
    ];
  }

  async executeTool(toolName, parameters) {
    const spinner = ora(`Executing ${toolName}...`).start();
    
    try {
      let result;
      
      switch (toolName) {
        case 'scan_directory':
          result = await this.scanDirectory(parameters.path, parameters.pattern, parameters.maxDepth);
          break;
        case 'read_file':
          result = await this.readFile(parameters.path, parameters.lineStart, parameters.lineEnd);
          break;
        case 'write_file':
          result = await this.writeFile(parameters.path, parameters.content, parameters.createBackup);
          break;
        case 'edit_file':
          result = await this.editFile(parameters.path, parameters.lineStart, parameters.lineEnd, parameters.newContent);
          break;
        case 'search_files':
          result = await this.searchFiles(parameters);
          break;
        case 'run_command':
          result = await this.runCommand(parameters.command, parameters.workingDir, parameters.timeout);
          break;
        case 'create_directory':
          result = await this.createDirectory(parameters.path);
          break;
        case 'delete_file':
          result = await this.deleteFile(parameters.path, parameters.recursive);
          break;
        case 'get_file_info':
          result = await this.getFileInfo(parameters.path);
          break;
        case 'find_and_replace':
          result = await this.findAndReplace(parameters.path, parameters.pattern, parameters.replacement, parameters.regex);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      spinner.succeed(`${toolName} completed`);
      return result;
    } catch (error) {
      spinner.fail(`${toolName} failed: ${error.message}`);
      throw error;
    }
  }

  async scanDirectory(dirPath, pattern, maxDepth) {
    const fs = await import('fs-extra');
    const { glob } = await import('glob');
    const path = await import('path');

    const fullPath = path.resolve(dirPath);
    const files = await glob(pattern || '**/*', {
      cwd: fullPath,
      dot: false,
      maxDepth: maxDepth || 5,
      onlyFiles: false
    });

    const fileTree = [];
    for (const file of files) {
      const fullFilePath = path.join(fullPath, file);
      try {
        const stats = await fs.stat(fullFilePath);
        fileTree.push({
          path: file,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime
        });
      } catch (error) {
        // Skip files that can't be accessed
      }
    }

    return fileTree;
  }

  async readFile(filePath, lineStart, lineEnd) {
    const fs = await import('fs-extra');
    const path = await import('path');

    const fullPath = path.resolve(filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    const start = Math.max(0, (lineStart || 1) - 1);
    const end = lineEnd ? Math.min(lines.length, lineEnd) : lines.length;
    const selectedLines = lines.slice(start, end);

    return {
      file: fullPath,
      lines: `${start + 1}-${end}`,
      content: selectedLines.join('\n'),
      totalLines: lines.length
    };
  }

  async writeFile(filePath, content, createBackup = false) {
    const fs = await import('fs-extra');
    const path = await import('path');

    const fullPath = path.resolve(filePath);
    
    if (createBackup && await fs.pathExists(fullPath)) {
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      await fs.copy(fullPath, backupPath);
    }

    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');

    return `Successfully wrote ${fullPath} (${content.length} bytes)`;
  }

  async editFile(filePath, lineStart, lineEnd, newContent) {
    const fs = await import('fs-extra');
    const path = await import('path');

    const fullPath = path.resolve(filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');

    const start = Math.max(0, lineStart - 1);
    const end = Math.min(lines.length, lineEnd);

    lines.splice(start, end - start, ...newContent.split('\n'));
    await fs.writeFile(fullPath, lines.join('\n'), 'utf-8');

    return `Successfully edited ${fullPath} (lines ${lineStart}-${lineEnd})`;
  }

  async searchFiles({ pattern, searchText, path: searchPath = '.', fileType }) {
    const fs = await import('fs-extra');
    const { glob } = await import('glob');
    const path = await import('path');

    const fullPath = path.resolve(searchPath);
    let files = [];

    if (pattern) {
      files = await glob(pattern, { cwd: fullPath, absolute: true });
    } else {
      files = await glob('**/*', { cwd: fullPath, absolute: true });
    }

    if (fileType) {
      files = files.filter(f => f.endsWith(fileType));
    }

    const results = [];
    if (searchText) {
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const lines = content.split('\n');
          const matches = [];
          
          lines.forEach((line, index) => {
            if (line.includes(searchText)) {
              matches.push({ line: index + 1, content: line.trim() });
            }
          });

          if (matches.length > 0) {
            results.push({ file, matches });
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    } else {
      results.push(...files.map(f => ({ file: f })));
    }

    return results;
  }

  async runCommand(command, workingDir = '.', timeout = 30000) {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const path = await import('path');
    const execAsync = promisify(exec);

    const fullPath = path.resolve(workingDir);
    const { stdout, stderr } = await execAsync(command, {
      cwd: fullPath,
      timeout: timeout || 30000
    });

    return {
      command,
      workingDir: fullPath,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0
    };
  }

  async createDirectory(dirPath) {
    const fs = await import('fs-extra');
    const path = await import('path');

    const fullPath = path.resolve(dirPath);
    await fs.ensureDir(fullPath);

    return `Successfully created directory: ${fullPath}`;
  }

  async deleteFile(filePath, recursive = false) {
    const fs = await import('fs-extra');
    const path = await import('path');

    const fullPath = path.resolve(filePath);
    await fs.remove(fullPath, { recursive: recursive || false });

    return `Successfully deleted: ${fullPath}`;
  }

  async getFileInfo(filePath) {
    const fs = await import('fs-extra');
    const path = await import('path');

    const fullPath = path.resolve(filePath);
    const stats = await fs.stat(fullPath);

    return {
      path: fullPath,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime,
      permissions: {
        readable: await this.checkPermission(fullPath, fs.constants.R_OK),
        writable: await this.checkPermission(fullPath, fs.constants.W_OK),
        executable: await this.checkPermission(fullPath, fs.constants.X_OK)
      }
    };
  }

  async checkPermission(filePath, mode) {
    const fs = await import('fs-extra');
    try {
      await fs.access(filePath, mode);
      return true;
    } catch {
      return false;
    }
  }

  async findAndReplace(filePath, pattern, replacement, useRegex = false) {
    const fs = await import('fs-extra');
    const path = await import('path');

    const fullPath = path.resolve(filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    
    let newContent;
    if (useRegex) {
      newContent = content.replace(new RegExp(pattern, 'g'), replacement);
    } else {
      newContent = content.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
    }

    await fs.writeFile(fullPath, newContent, 'utf-8');
    const changes = content !== newContent;

    return `Find and replace ${changes ? 'completed' : 'found no matches'} in ${fullPath}`;
  }

  async processUserRequest(userInput) {
    console.log(chalk.blue('\n🤖 AI Agent Processing Request...'));
    
    this.conversation.push({ role: 'user', content: userInput });

    try {
      const response = await this.openai.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: 'system',
            content: `You are an AI agent that can use tools to work on codebases. You have access to the following tools:
- scan_directory: Scan directories for file structure
- read_file: Read file contents
- write_file: Create or overwrite files
- edit_file: Edit specific lines in files
- search_files: Search for files and text patterns
- run_command: Execute shell commands
- create_directory: Create new directories
- delete_file: Delete files or directories
- get_file_info: Get detailed file information
- find_and_replace: Find and replace text in files

Use these tools to analyze, modify, and improve the codebase. Always explain your actions and provide context for changes.`
          },
          ...this.conversation
        ],
        tools: this.tools,
        max_tokens: 4096,
        temperature: 0.7
      });

      const message = response.choices[0].message;
      
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(chalk.yellow(`\n🔧 Executing ${message.tool_calls.length} tool(s)...`));
        
        for (const toolCall of message.tool_calls) {
          const result = await this.executeTool(toolCall.function.name, JSON.parse(toolCall.function.arguments));
          
          this.conversation.push({
            role: 'assistant',
            content: null,
            tool_calls: [toolCall]
          });
          
          this.conversation.push({
            role: 'tool',
            content: JSON.stringify(result),
            tool_call_id: toolCall.id
          });
        }

        // Get final response after tool execution
        const finalResponse = await this.openai.chat.completions.create({
          model: "openai/gpt-oss-20b",
          messages: this.conversation,
          max_tokens: 4096,
          temperature: 0.7
        });

        const finalMessage = finalResponse.choices[0].message;
        this.conversation.push({ role: 'assistant', content: finalMessage.content });
        
        console.log(chalk.green('\n✅ Task completed:'));
        console.log(finalMessage.content);
        
      } else {
        console.log(chalk.green('\n✅ Response:'));
        console.log(message.content);
        this.conversation.push({ role: 'assistant', content: message.content });
      }

    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  }

  async startInteractiveMode() {
    const inquirer = await import('inquirer');
    
    console.log(chalk.blue.bold('\n🤖 AI Agent - Codebase Assistant\n'));
    console.log(chalk.gray('Describe what you want to do with your codebase'));
    console.log(chalk.gray('Type "exit" to quit\n'));

    while (true) {
      const { input } = await inquirer.default.prompt([
        {
          type: 'input',
          name: 'input',
          message: chalk.green('Agent:'),
          validate: (input) => input.trim().length > 0 || 'Please enter a request'
        }
      ]);

      if (input.toLowerCase() === 'exit') {
        console.log(chalk.yellow('Goodbye!'));
        break;
      }

      await this.processUserRequest(input);
    }
  }

  async runCommandMode(command) {
    console.log(chalk.blue('🤖 AI Agent Executing Command...'));
    await this.processUserRequest(command);
  }
}

// Export for use by agentx.js
export default async function runAgent(agentName = 'default') {
  if (!process.env.api_key) {
    console.error(chalk.red('Error: API key not found in .env file'));
    console.log(chalk.yellow('💡 Make sure your .env file contains: api_key="your-key-here"'));
    process.exit(1);
  }

  const agent = new AIAgent();
  await agent.startInteractiveMode();
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAgent().catch(console.error);
}