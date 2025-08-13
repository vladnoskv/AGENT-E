#!/usr/bin/env node

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Test utilities
const runCommand = (cmd, options = {}) => {
  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      timeout: 30000,
      cwd: projectRoot,
      ...options
    });
    return { success: true, output: result, error: null };
  } catch (error) {
    return { success: false, output: error.stdout || '', error: error.message };
  }
};

const cleanupTestFiles = () => {
  const testFiles = [
    '.agentx-settings.json',
    'test-output.json',
    'temp-test-dir'
  ];
  
  testFiles.forEach(file => {
    const fullPath = path.join(projectRoot, file);
    if (fs.existsSync(fullPath)) {
      if (fs.lstatSync(fullPath).isDirectory()) {
        fs.removeSync(fullPath);
      } else {
        fs.unlinkSync(fullPath);
      }
    }
  });
};

describe('AGENTX CLI Tests', () => {
  beforeEach(() => {
    cleanupTestFiles();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestFiles();
  });

  describe('CLI Entry Points', () => {
    it('should display help for agentx.js', () => {
      const result = runCommand('node main/agentx.js --help');
      expect(result.success).toBe(true);
      expect(result.output).toContain('AGENTX');
      expect(result.output).toContain('Usage:');
      expect(result.output).toContain('chat');
      expect(result.output).toContain('agent');
      expect(result.output).toContain('demo');
      expect(result.output).toContain('ui');
    });

    it('should display version information', () => {
      const result = runCommand('node main/agentx.js --version');
      expect(result.success).toBe(true);
      expect(result.output).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should handle invalid commands gracefully', () => {
      const result = runCommand('node main/agentx.js invalid-command');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown command');
    });
  });

  describe('Agent Commands', () => {
    it('should run master agent with valid input', () => {
      const result = runCommand('node main/agentx.js agent master --task "test task"');
      expect(result.success || result.output.includes('task')).toBe(true);
    });

    it('should fail gracefully with missing agent name', () => {
      const result = runCommand('node main/agentx.js agent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should handle non-existent agent', () => {
      const result = runCommand('node main/agentx.js agent nonexistent');
      expect(result.success).toBe(false);
      expect(result.error || result.output).toContain('not found');
    });
  });

  describe('Multi-Agent Demo', () => {
    it('should run demo without errors', () => {
      const result = runCommand('node main/agentx.js demo --test');
      expect(result.success || result.output.includes('demo')).toBe(true);
    });

    it('should handle demo with custom directory', () => {
      const result = runCommand('node main/agentx.js demo --dir ./src');
      expect(result.success || result.output.includes('demo')).toBe(true);
    });
  });

  describe('Settings Management', () => {
    it('should create settings file on first run', () => {
      runCommand('node main/agentx.js --help');
      const settingsPath = path.join(projectRoot, '.agentx-settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);
    });

    it('should load existing settings', () => {
      const testSettings = {
        api: { provider: 'test-provider' },
        ui: { theme: 'dark' }
      };
      fs.writeJSONSync(path.join(projectRoot, '.agentx-settings.json'), testSettings);
      
      const result = runCommand('node utils/settings-manager.js get api.provider');
      expect(result.success).toBe(true);
      expect(result.output).toContain('test-provider');
    });

    it('should validate settings', () => {
      const invalidSettings = { api: { temperature: 'invalid' } };
      fs.writeJSONSync(path.join(projectRoot, '.agentx-settings.json'), invalidSettings);
      
      const result = runCommand('node utils/settings-manager.js validate');
      expect(result.success).toBe(false);
      expect(result.error || result.output).toContain('invalid');
    });
  });

  describe('File System Operations', () => {
    it('should scan directory successfully', () => {
      const result = runCommand('node main/agentx.js scan --path ./main');
      expect(result.success).toBe(true);
      expect(result.output).toContain('agentx.js');
    });

    it('should handle non-existent directory', () => {
      const result = runCommand('node main/agentx.js scan --path ./nonexistent');
      expect(result.success).toBe(false);
      expect(result.error || result.output).toContain('not found');
    });

    it('should read file content', () => {
      const result = runCommand('node main/agentx.js read --file package.json');
      expect(result.success).toBe(true);
      expect(result.output).toContain('name');
      expect(result.output).toContain('version');
    });
  });

  describe('Error Handling', () => {
    it('should handle permission errors gracefully', () => {
      const protectedPath = '/root/protected';
      const result = runCommand(`node main/agentx.js scan --path ${protectedPath}`);
      expect(result.success).toBe(false);
      expect(result.error || result.output).toContain('permission');
    });

    it('should handle invalid JSON gracefully', () => {
      const invalidJsonPath = path.join(projectRoot, 'invalid.json');
      fs.writeFileSync(invalidJsonPath, '{ invalid json }');
      
      const result = runCommand(`node main/agentx.js read --file ${invalidJsonPath}`);
      expect(result.success).toBe(false);
      expect(result.error || result.output).toContain('JSON');
    });

    it('should handle network timeouts', () => {
      const result = runCommand('node main/agentx.js agent master --task "test" --timeout 1', {
        timeout: 2000
      });
      expect(result.success).toBe(false);
      expect(result.error || result.output).toContain('timeout');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large directory scanning', () => {
      const startTime = Date.now();
      const result = runCommand('node main/agentx.js scan --path ./ --max-depth 3');
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent operations', () => {
      const commands = [
        'node main/agentx.js scan --path ./main',
        'node main/agentx.js scan --path ./utils',
        'node main/agentx.js scan --path ./tests'
      ];

      const results = commands.map(cmd => runCommand(cmd));
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('UI Tests', () => {
    it('should launch UI mode', () => {
      const result = runCommand('node main/agentx-ui.js --test', {
        timeout: 3000
      });
      expect(result.success || result.output.includes('AGENTX')).toBe(true);
    });

    it('should handle UI settings changes', () => {
      const result = runCommand('node main/agentx-ui.js --settings-test', {
        timeout: 3000
      });
      expect(result.success || result.output.includes('Settings')).toBe(true);
    });
  });

  describe('Security Tests', () => {
    it('should prevent directory traversal', () => {
      const maliciousPath = '../../../etc/passwd';
      const result = runCommand(`node main/agentx.js scan --path ${maliciousPath}`);
      expect(result.success).toBe(false);
      expect(result.error || result.output).toContain('invalid');
    });

    it('should sanitize file paths', () => {
      const result = runCommand('node main/agentx.js read --file /etc/passwd');
      expect(result.success).toBe(false);
      expect(result.error || result.output).toContain('access');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full workflow', async () => {
      // 1. Initialize settings
      const initResult = runCommand('node main/agentx.js --init');
      expect(initResult.success).toBe(true);

      // 2. Run agent
      const agentResult = runCommand('node main/agentx.js agent master --task "create test file"');
      expect(agentResult.success).toBe(true);

      // 3. Verify file was created
      const testFile = path.join(projectRoot, 'test-output.json');
      expect(fs.existsSync(testFile)).toBe(true);

      // 4. Clean up
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    });
  });
});

// Test runner
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running AGENTX CLI tests...\n');
  
  // Run specific test if provided
  const testName = process.argv[2];
  if (testName) {
    console.log(`Running specific test: ${testName}`);
    const { spawn } = await import('child_process');
    const testProcess = spawn('vitest', ['run', testName], {
      stdio: 'inherit',
      cwd: projectRoot
    });
    
    testProcess.on('close', (code) => {
      process.exit(code);
    });
  } else {
    // Run all tests
    const { spawn } = await import('child_process');
    const testProcess = spawn('vitest', ['run'], {
      stdio: 'inherit',
      cwd: projectRoot
    });
    
    testProcess.on('close', (code) => {
      console.log(`\nTests completed with exit code: ${code}`);
      process.exit(code);
    });
  }
}