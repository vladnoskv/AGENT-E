// Test setup file for vitest
import { vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';

// Global test setup
beforeEach(() => {
  // Reset any global state
  vi.clearAllMocks();
  
  // Clean up test artifacts
  const testArtifacts = [
    '.agentx-settings.json',
    'test-output.json',
    'temp-test-dir',
    'test-log.txt'
  ];
  
  testArtifacts.forEach(artifact => {
    const fullPath = path.resolve(artifact);
    if (fs.existsSync(fullPath)) {
      try {
        if (fs.lstatSync(fullPath).isDirectory()) {
          fs.removeSync(fullPath);
        } else {
          fs.unlinkSync(fullPath);
        }
      } catch (error) {
        console.warn(`Failed to cleanup ${fullPath}:`, error.message);
      }
    }
  });
});

// Mock console methods for cleaner test output
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

// Only show errors during tests unless DEBUG=true
if (!process.env.DEBUG) {
  console.log = vi.fn();
  console.info = vi.fn();
  console.warn = vi.fn();
}

// Restore console on exit
process.on('exit', () => {
  Object.assign(console, originalConsole);
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AGENTX_TEST_MODE = 'true';

// Mock file system operations for isolated tests
vi.mock('fs-extra', async () => {
  const actual = await vi.importActual('fs-extra');
  return {
    ...actual,
    // Add any fs-specific mocks here
  };
});

// Mock console for testing
export const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};