#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Simple test runner without vitest
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 AGENTX Verification Tests\n');
    
    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }
}

const runner = new TestRunner();

// Helper functions
const runCommand = (cmd, options = {}) => {
  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      timeout: 10000,
      cwd: projectRoot,
      ...options
    });
    return { success: true, output: result, error: null };
  } catch (error) {
    return { success: false, output: error.stdout || '', error: error.message };
  }
};

// CLI Entry Point Tests
runner.test('agentx.js should exist and be executable', () => {
  const agentxPath = path.join(projectRoot, 'main', 'agentx.js');
  runner.assert(fs.existsSync(agentxPath), 'agentx.js should exist');
  runner.assert(fs.statSync(agentxPath).mode & 0o100, 'agentx.js should be executable');
});

runner.test('agentx.js should display help', () => {
  const result = runCommand('node main/agentx.js --help');
  runner.assert(result.success, 'Command should succeed');
  runner.assert(result.output.includes('AGENTX'), 'Output should contain AGENTX');
  runner.assert(result.output.includes('chat'), 'Output should contain chat command');
});

runner.test('agentx.js should display version', () => {
  const result = runCommand('node main/agentx.js --version');
  runner.assert(result.success, 'Command should succeed');
  runner.assert(/\d+\.\d+\.\d+/.test(result.output), 'Output should contain version number');
});

// Settings Tests
runner.test('settings-manager should load and save settings', () => {
  const settingsPath = path.join(projectRoot, '.agentx-settings.json');
  
  // Clean up
  if (fs.existsSync(settingsPath)) {
    fs.unlinkSync(settingsPath);
  }
  
  // Test settings creation
  runCommand('node utils/settings-manager.js set api.provider test-provider');
  runner.assert(fs.existsSync(settingsPath), 'Settings file should be created');
  
  const settings = fs.readJSONSync(settingsPath);
  runner.assert(settings.api.provider === 'test-provider', 'Setting should be saved correctly');
});

// File Operations Tests
runner.test('should scan directory successfully', () => {
  const result = runCommand('node main/agentx.js scan --path ./main');
  runner.assert(result.success, 'Scan command should succeed');
  runner.assert(result.output.includes('agentx.js'), 'Output should contain agentx.js');
});

runner.test('should read package.json', () => {
  const result = runCommand('node main/agentx.js read --file package.json');
  runner.assert(result.success, 'Read command should succeed');
  runner.assert(result.output.includes('name'), 'Output should contain package name');
});

// Error Handling Tests
runner.test('should handle invalid directory gracefully', () => {
  const result = runCommand('node main/agentx.js scan --path ./nonexistent');
  runner.assert(!result.success || result.output.includes('not found'), 'Should handle invalid directory');
});

runner.test('should handle missing agent gracefully', () => {
  const result = runCommand('node main/agentx.js agent');
  runner.assert(!result.success, 'Should fail without agent name');
});

// UI Tests
runner.test('agentx-ui.js should exist', () => {
  const uiPath = path.join(projectRoot, 'main', 'agentx-ui.js');
  runner.assert(fs.existsSync(uiPath), 'agentx-ui.js should exist');
});

runner.test('multi-agent.js should exist', () => {
  const multiAgentPath = path.join(projectRoot, 'main', 'multi-agent.js');
  runner.assert(fs.existsSync(multiAgentPath), 'multi-agent.js should exist');
});

runner.test('agent.js should exist', () => {
  const agentPath = path.join(projectRoot, 'main', 'agent.js');
  runner.assert(fs.existsSync(agentPath), 'agent.js should exist');
});

// Package.json Tests
runner.test('package.json should have correct bin entries', () => {
  const packagePath = path.join(projectRoot, 'package.json');
  const packageJson = fs.readJSONSync(packagePath);
  
  runner.assert(packageJson.bin.agentx === './main/agentx.js', 'agentx bin entry should be correct');
  runner.assert(packageJson.bin['agentx-i18n'] === './main/agentx-i18n.js', 'agentx-i18n bin entry should be correct');
});

// Security Tests
runner.test('should prevent directory traversal', () => {
  const result = runCommand('node main/agentx.js scan --path ../../../etc');
  runner.assert(!result.success || result.output.includes('invalid'), 'Should prevent directory traversal');
});

// Performance Tests
runner.test('should complete scan within timeout', () => {
  const start = Date.now();
  const result = runCommand('node main/agentx.js scan --path ./ --max-depth 2');
  const duration = Date.now() - start;
  
  runner.assert(result.success, 'Scan should complete successfully');
  runner.assert(duration < 5000, `Scan should complete within 5 seconds (took ${duration}ms)`);
});

// Integration Tests
runner.test('should complete basic workflow', async () => {
  const testFile = path.join(projectRoot, 'test-output.json');
  
  // Clean up
  if (fs.existsSync(testFile)) {
    fs.unlinkSync(testFile);
  }
  
  // Test basic workflow
  const result = runCommand('node main/agentx.js agent master --task "create test file"');
  runner.assert(result.success || result.output.includes('test'), 'Basic workflow should complete');
});

// Run all tests
async function main() {
  const success = await runner.run();
  
  // Clean up
  const settingsPath = path.join(projectRoot, '.agentx-settings.json');
  if (fs.existsSync(settingsPath)) {
    fs.unlinkSync(settingsPath);
  }
  
  const testFile = path.join(projectRoot, 'test-output.json');
  if (fs.existsSync(testFile)) {
    fs.unlinkSync(testFile);
  }
  
  console.log(success ? '\n🎉 All tests passed!' : '\n⚠️  Some tests failed, please check the output above.');
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default runner;