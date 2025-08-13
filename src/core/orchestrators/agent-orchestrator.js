#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
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
    console.log(chalk.blue.bold('\n🤖 AGENT-E Task Orchestrator'));
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
  if (args.length === 0 || args.includes('--help')) {
    console.log(chalk.cyan.bold('🤖 AGENT-E Orchestrator'));
    console.log('');
    console.log('Usage:');
    console.log('  node src/core/orchestrators/agent-orchestrator.js <task> [options]');
    console.log('');
    console.log('Examples:');
    console.log('  node src/core/orchestrators/agent-orchestrator.js "Add error handling to server.js"');
    console.log('  node src/core/orchestrators/agent-orchestrator.js "Create unit tests for utils.js" --file utils.js');
    console.log('  node src/core/orchestrators/agent-orchestrator.js "Document the API endpoints" --show-thinking');
    return;
  }

  const task = args.join(' ');
  const showThinking = args.includes('--show-thinking');
  const fileIndex = args.findIndex(arg => arg === '--file');
  const targetFile = fileIndex !== -1 ? args[fileIndex + 1] : null;
  const model = args.includes('--120b') ? '120b' : '20b';

  const orchestrator = new AgentOrchestrator({ model });
  await orchestrator.orchestrateTask(task, { showThinking, targetFile });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { AgentOrchestrator };
export default AgentOrchestrator;
