#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import NvidiaClient from '../api/nvidia.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

class AgentOrchestrator {
  constructor({ model = '20b' } = {}) {
    this.client = new NvidiaClient({ model });

    this.agents = {
      master: {
        name: 'Master Agent',
        role: 'Orchestrates tasks and synthesizes responses',
        prompt: 'You are the master agent. Analyze the user request, break it into sub-tasks, and coordinate with specialized agents. Provide concise final responses.',
      },
      code: {
        name: 'Code Agent',
        role: 'Analyzes and modifies code files',
        prompt: 'You are a code analysis agent. Focus on code quality, bugs, and improvements. Provide specific, actionable feedback.',
      },
      doc: {
        name: 'Documentation Agent',
        role: 'Creates and updates documentation',
        prompt: 'You are a documentation agent. Create clear, concise documentation for code and systems.',
      },
      test: {
        name: 'Testing Agent',
        role: 'Creates and runs tests',
        prompt: 'You are a testing agent. Create comprehensive tests and validate functionality.',
      },
    };
  }

  async runCommand(command, args = [], { cwd = process.cwd(), timeout = 0, env = process.env } = {}) {
    return new Promise((resolve, reject) => {
      const spinner = ora(`Running command: ${command} ${args.join(' ')}`).start();
      const child = spawn(command, args, { cwd, env, shell: true });
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const onDataOut = (d) => { stdout += d.toString(); };
      const onDataErr = (d) => { stderr += d.toString(); };
      child.stdout?.on('data', onDataOut);
      child.stderr?.on('data', onDataErr);

      let to;
      if (timeout && timeout > 0) {
        to = setTimeout(() => {
          timedOut = true;
          spinner.warn(`Command timed out after ${timeout}ms, killing...`);
          child.kill('SIGKILL');
        }, timeout);
      }

      child.on('close', (code) => {
        if (to) clearTimeout(to);
        if (!timedOut) spinner.succeed(`Command exited with code ${code}`);
        resolve({ code, stdout, stderr });
      });

      child.on('error', (err) => {
        if (to) clearTimeout(to);
        spinner.fail(`Failed to run command: ${err.message}`);
        reject(err);
      });
    });
  }

  async analyzeCommandOutput(command, { code, stdout, stderr }) {
    const prompt = `You are a DevOps assistant. Analyze the following command execution and provide:
1) A brief summary of what happened
2) Any errors and likely causes
3) Concrete next steps or fixes

Command: ${command}
Exit code: ${code}
STDOUT:\n${stdout}\n
STDERR:\n${stderr}`;
    const analysis = await this.callModel(prompt);
    return analysis;
  }

  async dispatchToAgent(agentType, task, context = {}) {
    const spinner = ora({ text: `${this.agents[agentType].name} processing...`, hideCursor: false }).start();

    try {
      const prompt = this.buildAgentPrompt(agentType, task, context);
      const response = await this.callModel(prompt);
      spinner.succeed(`${this.agents[agentType].name} completed`);
      return { agent: agentType, response, timestamp: new Date().toISOString() };
    } catch (error) {
      spinner.fail(`${this.agents[agentType].name} failed: ${error.message}`);
      throw error;
    }
  }

  async callModel(prompt) {
    const content = await this.client.chat([
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.7, max_tokens: 800 });
    return content;
  }

  buildAgentPrompt(agentType, task, context) {
    const agent = this.agents[agentType];
    return `${agent.prompt}

Task: ${task}

Context: ${JSON.stringify(context, null, 2)}

Provide a focused response:`;
  }

  async editFile(filePath, instructions) {
    const spinner = ora('Reading file...').start();
    try {
      if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const originalContent = readFileSync(filePath, 'utf8');
      spinner.text = 'Analyzing file with code agent...';

      const context = { filePath, originalContent, instructions };
      const codeAnalysis = await this.dispatchToAgent('code', `Analyze this file and apply these instructions: ${instructions}`, context);

      spinner.text = 'Generating updated file...';
      const updatedContent = await this.callModel(
        `Based on this analysis, provide the complete updated file content:\n\n${codeAnalysis.response}\n\nOriginal file:\n${originalContent}\n\nApply changes and return the complete updated file content only:`
      );

      writeFileSync(filePath, updatedContent.trim());
      spinner.succeed(`File updated: ${filePath}`);
      return { success: true, filePath, changes: codeAnalysis.response };
    } catch (error) {
      spinner.fail(`Failed to edit file: ${error.message}`);
      throw error;
    }
  }

  async runTest(testFile, expectedOutput) {
    const spinner = ora('Running test...').start();
    try {
      const testContent = readFileSync(testFile, 'utf8');
      const testAgent = await this.dispatchToAgent('test', `Execute this test and validate results`, { testContent, expectedOutput });
      spinner.succeed('Test completed');
      return { success: true, results: testAgent.response, passed: testAgent.response.includes('PASSED') };
    } catch (error) {
      spinner.fail('Test failed');
      return { success: false, error: error.message };
    }
  }

  async orchestrateTask(userRequest, options = {}) {
    const { showThinking = false, targetFile = null } = options;
    console.log(chalk.blue.bold('\n🤖 AGENT-X Task Orchestrator'));
    console.log(chalk.gray('='.repeat(40)));

    try {
      const masterAnalysis = await this.dispatchToAgent('master', userRequest);
      if (showThinking) {
        console.log(chalk.yellow('\n🔍 Master Analysis:'));
        console.log(masterAnalysis.response);
      }

      let results = [];
      if (targetFile && userRequest.includes('edit')) {
        const editResult = await this.editFile(targetFile, userRequest);
        results.push(editResult);
        const testResult = await this.runTest(targetFile, 'functionality test');
        results.push(testResult);
      } else {
        const codeResult = await this.dispatchToAgent('code', userRequest);
        const docResult = await this.dispatchToAgent('doc', userRequest);
        results.push(codeResult, docResult);
      }

      const finalResponse = await this.callModel(
        `Synthesize these agent responses into a concise final answer:\n\n${results.map(r => `${r.agent || 'result'}: ${JSON.stringify(r)}`).join('\n')}\n\nUser request: ${userRequest}`
      );

      console.log(chalk.green.bold('\n✅ Final Response:'));
      console.log(finalResponse);
      return { success: true, results, finalResponse };
    } catch (error) {
      console.error(chalk.red('❌ Task failed:'), error.message);
      return { success: false, error: error.message };
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const hasExec = args.includes('--exec');

  // If no arguments and not in exec mode, show interactive help
  if (args.length === 0 && !hasExec) {
    console.log(chalk.blue.bold('🤖 AGENT-X Task Orchestrator'));
    console.log(chalk.gray('='.repeat(40)));
    console.log('\nThis is the Agent Orchestrator. You can use it in several ways:');
    console.log('\n1. Run a task directly:');
    console.log('   node agent-orchestrator.js "Your task description"');
    console.log('\n2. Run a shell command and analyze its output:');
    console.log('   node agent-orchestrator.js --exec "your-command" [--cwd <directory>] [--timeout <ms>]');
    console.log('\n3. Show help:');
    console.log('   node agent-orchestrator.js --help');
    return;
  }

  if ((!hasExec && args.length === 0) || args.includes('--help')) {
    console.log(chalk.cyan.bold('🤖 AGENT-X Orchestrator'));
    console.log('');
    console.log('Usage:');
    console.log('  node src/core/orchestrators/agent-orchestrator.js <task> [options]');
    console.log('  node src/core/orchestrators/agent-orchestrator.js --exec "<command> [args]" [--cwd <dir>] [--timeout <ms>]');
    console.log('');
    console.log('Examples:');
    console.log('  node src/core/orchestrators/agent-orchestrator.js "Add error handling to server.js"');
    console.log('  node src/core/orchestrators/agent-orchestrator.js "Create unit tests for utils.js" --file utils.js');
    console.log('  node src/core/orchestrators/agent-orchestrator.js "Document the API endpoints" --show-thinking');
    console.log('  node src/core/orchestrators/agent-orchestrator.js --exec "npm run test" --timeout 60000');
    return;
  }

  const model = args.includes('--120b') ? '120b' : '20b';
  const orchestrator = new AgentOrchestrator({ model });

  if (hasExec) {
    const execIndex = args.indexOf('--exec');
    const commandString = args[execIndex + 1] || '';
    const cwdIndex = args.indexOf('--cwd');
    const timeoutIndex = args.indexOf('--timeout');
    const cwd = cwdIndex !== -1 ? args[cwdIndex + 1] : process.cwd();
    const timeout = timeoutIndex !== -1 ? parseInt(args[timeoutIndex + 1], 10) : 0;

    if (!commandString) {
      console.error(chalk.red('❌ Missing command after --exec'));
      process.exit(1);
    }

    // Basic split, users can quote args; shell:true already handles most
    const [cmd, ...cmdArgs] = commandString.split(' ');
    const result = await orchestrator.runCommand(cmd, cmdArgs, { cwd, timeout });
    const analysis = await orchestrator.analyzeCommandOutput(commandString, result);
    console.log(chalk.green.bold('\n✅ Analysis:'));
    console.log(analysis);
    return;
  }

  const showThinking = args.includes('--show-thinking');
  const fileIndex = args.findIndex(arg => arg === '--file');
  const targetFile = fileIndex !== -1 ? args[fileIndex + 1] : null;
  const task = args.join(' ');

  await orchestrator.orchestrateTask(task, { showThinking, targetFile });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { AgentOrchestrator };
export default AgentOrchestrator;
