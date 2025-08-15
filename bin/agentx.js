#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import { logError, withErrorHandling } from '../src/utils/error-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const subcmd = args[0] || 'menu';
const rest = args.slice(1);

const routes = {
  menu: join(__dirname, '..', 'src', 'commands', 'ink-interface.jsx'),
  chat: join(__dirname, '..', 'src', 'commands', 'chat.js'),
  response: join(__dirname, '..', 'src', 'commands', 'response.js'),
  agent: join(__dirname, '..', 'src', 'core', 'orchestrators', 'agent-orchestrator.js'),
  expert: join(__dirname, '..', 'src', 'agents', 'expert', 'hyper-expert-orchestrator.js'),
  'update-knowledge': join(__dirname, '..', 'src', 'knowledge', 'knowledge-updater.js'),
  index: join(__dirname, '..', 'src', 'commands', 'index-codebase.js'),
  test: join(__dirname, '..', 'tests', 'test-comprehensive.js'),
};

const target = routes[subcmd] || routes.menu;

// Use run-jsx.js for .jsx files, regular node for others
const isJSX = target.endsWith('.jsx');
const nodeCmd = 'node';

// For .jsx files, execute via CommonJS helper that registers Babel and then requires the file.
// For .js files, run the target directly (project uses ESM via "type": "module").
const nodeArgs = isJSX
  ? [
      join(__dirname, '..', 'run-jsx.cjs'),
      target,
      ...rest
    ]
  : [
      target,
      ...rest
    ];

const runWithErrorHandling = withErrorHandling(async () => {
  const child = spawn(nodeCmd, nodeArgs, { 
    stdio: 'pipe', // Changed from 'inherit' to 'pipe' to capture output
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: '--experimental-specifier-resolution=node',
    }
  });

  // Forward stdout and stderr to parent process
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  // Buffer output for error logging
  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
  });
  child.stderr.on('data', (data) => {
    output += data.toString();
  });

  return new Promise((resolve) => {
    child.on('close', (code) => {
      if (code !== 0) {
        logError(new Error(`Process exited with code ${code}`), `agentx-${subcmd}`);
        console.error(`\nError: Process exited with code ${code}. Check logs/error.log for details.`);
      }
      resolve(code || 0);
    });
  });
}, 'main-process');

// Run the application with error handling
runWithErrorHandling().then(code => process.exit(code));
