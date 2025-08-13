import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class CodebaseMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'codebase-tools',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'scan_directory',
          description: 'Scan a directory and return file structure with metadata',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Directory path to scan' },
              pattern: { type: 'string', description: 'File pattern to match (optional)' },
              maxDepth: { type: 'number', description: 'Maximum depth to scan (optional)' }
            },
            required: ['path']
          }
        },
        {
          name: 'read_file',
          description: 'Read and return the contents of a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path to read' },
              lineStart: { type: 'number', description: 'Start line number (optional)' },
              lineEnd: { type: 'number', description: 'End line number (optional)' }
            },
            required: ['path']
          }
        },
        {
          name: 'write_file',
          description: 'Write content to a file (creates directories if needed)',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path to write' },
              content: { type: 'string', description: 'Content to write' },
              createBackup: { type: 'boolean', description: 'Create backup before writing' }
            },
            required: ['path', 'content']
          }
        },
        {
          name: 'edit_file',
          description: 'Edit a file by replacing content between line numbers',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path to edit' },
              lineStart: { type: 'number', description: 'Start line number' },
              lineEnd: { type: 'number', description: 'End line number' },
              newContent: { type: 'string', description: 'New content to insert' }
            },
            required: ['path', 'lineStart', 'lineEnd', 'newContent']
          }
        },
        {
          name: 'search_files',
          description: 'Search for files containing specific patterns or text',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: { type: 'string', description: 'Search pattern (glob or regex)' },
              searchText: { type: 'string', description: 'Text to search within files' },
              path: { type: 'string', description: 'Directory to search in' },
              fileType: { type: 'string', description: 'File extension filter (e.g., .js, .py)' }
            },
            required: ['path']
          }
        },
        {
          name: 'run_command',
          description: 'Execute a shell command and return output',
          inputSchema: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'Command to execute' },
              workingDir: { type: 'string', description: 'Working directory (optional)' },
              timeout: { type: 'number', description: 'Timeout in milliseconds (optional)' }
            },
            required: ['command']
          }
        },
        {
          name: 'create_directory',
          description: 'Create a new directory structure',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Directory path to create' }
            },
            required: ['path']
          }
        },
        {
          name: 'delete_file',
          description: 'Delete a file or directory',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to delete' },
              recursive: { type: 'boolean', description: 'Delete recursively (for directories)' }
            },
            required: ['path']
          }
        },
        {
          name: 'get_file_info',
          description: 'Get detailed file/directory information',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File or directory path' }
            },
            required: ['path']
          }
        },
        {
          name: 'find_and_replace',
          description: 'Find and replace text in files',
          inputSchema: {
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
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'scan_directory':
            return await this.scanDirectory(args.path, args.pattern, args.maxDepth);
          case 'read_file':
            return await this.readFile(args.path, args.lineStart, args.lineEnd);
          case 'write_file':
            return await this.writeFile(args.path, args.content, args.createBackup);
          case 'edit_file':
            return await this.editFile(args.path, args.lineStart, args.lineEnd, args.newContent);
          case 'search_files':
            return await this.searchFiles(args);
          case 'run_command':
            return await this.runCommand(args.command, args.workingDir, args.timeout);
          case 'create_directory':
            return await this.createDirectory(args.path);
          case 'delete_file':
            return await this.deleteFile(args.path, args.recursive);
          case 'get_file_info':
            return await this.getFileInfo(args.path);
          case 'find_and_replace':
            return await this.findAndReplace(args.path, args.pattern, args.replacement, args.regex);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }

  async scanDirectory(dirPath, pattern = '**/*', maxDepth = 5) {
    const fullPath = path.resolve(dirPath);
    const files = await glob(pattern, {
      cwd: fullPath,
      dot: false,
      maxDepth: maxDepth,
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

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ directory: fullPath, files: fileTree }, null, 2)
      }]
    };
  }

  async readFile(filePath, lineStart = 1, lineEnd = null) {
    const fullPath = path.resolve(filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    const start = Math.max(0, lineStart - 1);
    const end = lineEnd ? Math.min(lines.length, lineEnd) : lines.length;
    const selectedLines = lines.slice(start, end);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          file: fullPath,
          lines: `${start + 1}-${end}`,
          content: selectedLines.join('\n'),
          totalLines: lines.length
        }, null, 2)
      }]
    };
  }

  async writeFile(filePath, content, createBackup = false) {
    const fullPath = path.resolve(filePath);
    
    if (createBackup && await fs.pathExists(fullPath)) {
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      await fs.copy(fullPath, backupPath);
    }

    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');

    return {
      content: [{
        type: 'text',
        text: `Successfully wrote ${fullPath} (${content.length} bytes)`
      }]
    };
  }

  async editFile(filePath, lineStart, lineEnd, newContent) {
    const fullPath = path.resolve(filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');

    const start = Math.max(0, lineStart - 1);
    const end = Math.min(lines.length, lineEnd);

    lines.splice(start, end - start, ...newContent.split('\n'));
    await fs.writeFile(fullPath, lines.join('\n'), 'utf-8');

    return {
      content: [{
        type: 'text',
        text: `Successfully edited ${fullPath} (lines ${lineStart}-${lineEnd})`
      }]
    };
  }

  async searchFiles({ pattern, searchText, path: searchPath = '.', fileType }) {
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

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ results }, null, 2)
      }]
    };
  }

  async runCommand(command, workingDir = '.', timeout = 30000) {
    const fullPath = path.resolve(workingDir);
    const { stdout, stderr } = await execAsync(command, {
      cwd: fullPath,
      timeout: timeout
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          command,
          workingDir: fullPath,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0
        }, null, 2)
      }]
    };
  }

  async createDirectory(dirPath) {
    const fullPath = path.resolve(dirPath);
    await fs.ensureDir(fullPath);

    return {
      content: [{
        type: 'text',
        text: `Successfully created directory: ${fullPath}`
      }]
    };
  }

  async deleteFile(filePath, recursive = false) {
    const fullPath = path.resolve(filePath);
    await fs.remove(fullPath, { recursive });

    return {
      content: [{
        type: 'text',
        text: `Successfully deleted: ${fullPath}`
      }]
    };
  }

  async getFileInfo(filePath) {
    const fullPath = path.resolve(filePath);
    const stats = await fs.stat(fullPath);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
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
        }, null, 2)
      }]
    };
  }

  async checkPermission(filePath, mode) {
    try {
      await fs.access(filePath, mode);
      return true;
    } catch {
      return false;
    }
  }

  async findAndReplace(filePath, pattern, replacement, useRegex = false) {
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

    return {
      content: [{
        type: 'text',
        text: `Find and replace ${changes ? 'completed' : 'found no matches'} in ${fullPath}`
      }]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Codebase MCP server started');
  }
}

const server = new CodebaseMCPServer();
server.run().catch(console.error);