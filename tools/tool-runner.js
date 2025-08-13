import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ToolRunner {
  constructor() {
    this.workingDir = process.cwd();
  }

  async scanDirectory(dirPath = '.', pattern = '**/*', maxDepth = 5) {
    const fullPath = path.resolve(this.workingDir, dirPath);
    const files = await glob(pattern, {
      cwd: fullPath,
      dot: false,
      maxDepth,
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
          modified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString()
        });
      } catch (error) {
        // Skip files that can't be accessed
      }
    }

    return {
      directory: fullPath,
      files: fileTree
    };
  }

  async readFile(filePath, lineStart = 1, lineEnd = null) {
    const fullPath = path.resolve(this.workingDir, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    const start = Math.max(0, lineStart - 1);
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
    const fullPath = path.resolve(this.workingDir, filePath);
    
    if (createBackup && await fs.pathExists(fullPath)) {
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      await fs.copy(fullPath, backupPath);
    }

    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');

    return {
      success: true,
      path: fullPath,
      bytes: content.length
    };
  }

  async editFile(filePath, lineStart, lineEnd, newContent) {
    const fullPath = path.resolve(this.workingDir, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');

    const start = Math.max(0, lineStart - 1);
    const end = Math.min(lines.length, lineEnd);

    lines.splice(start, end - start, ...newContent.split('\n'));
    await fs.writeFile(fullPath, lines.join('\n'), 'utf-8');

    return {
      success: true,
      path: fullPath,
      lines: `${lineStart}-${lineEnd}`
    };
  }

  async searchFiles({ pattern = '**/*', searchText, path: searchPath = '.', fileType }) {
    const fullPath = path.resolve(this.workingDir, searchPath);
    let files = [];

    files = await glob(pattern, { cwd: fullPath, absolute: true });

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
            if (line.toLowerCase().includes(searchText.toLowerCase())) {
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
    const fullPath = path.resolve(this.workingDir, workingDir);
    const { stdout, stderr } = await execAsync(command, {
      cwd: fullPath,
      timeout
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
    const fullPath = path.resolve(this.workingDir, dirPath);
    await fs.ensureDir(fullPath);
    return { success: true, path: fullPath };
  }

  async deleteFile(filePath, recursive = false) {
    const fullPath = path.resolve(this.workingDir, filePath);
    await fs.remove(fullPath, { recursive });
    return { success: true, path: fullPath };
  }

  async getFileInfo(filePath) {
    const fullPath = path.resolve(this.workingDir, filePath);
    const stats = await fs.stat(fullPath);

    return {
      path: fullPath,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      modified: stats.mtime.toISOString(),
      created: stats.birthtime.toISOString(),
      permissions: {
        readable: await this.checkPermission(fullPath, fs.constants.R_OK),
        writable: await this.checkPermission(fullPath, fs.constants.W_OK),
        executable: await this.checkPermission(fullPath, fs.constants.X_OK)
      }
    };
  }

  async checkPermission(filePath, mode) {
    try {
      await fs.access(path.resolve(this.workingDir, filePath), mode);
      return true;
    } catch {
      return false;
    }
  }

  async findAndReplace(filePath, pattern, replacement, useRegex = false) {
    const fullPath = path.resolve(this.workingDir, filePath);
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
      success: true,
      path: fullPath,
      changes: changes ? 1 : 0
    };
  }
}

export default ToolRunner;